import {
  LeafletProvider,
  type LeafletContextInterface,
  createLeafletContext,
} from "@react-leaflet/core";
import {
  type FitBoundsOptions,
  type LatLngBoundsExpression,
  Map as LeafletMap,
  type MapOptions,
  Handler,
  DomEvent,
} from "leaflet";
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

/**
 *  Super ugly fix to enable smooth scrolling
 *  https://github.com/alexatiks/Leaflet.SmoothWheelZoom
 */
LeafletMap.mergeOptions({
  // @section Mousewheel options
  // @option smoothWheelZoom: Boolean|String = true
  // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
  // it will zoom to the center of the view regardless of where the mouse was.
  smoothWheelZoom: true,

  // @option smoothWheelZoom: number = 1
  // setting zoom speed
  smoothSensitivity: 1,
});

// @ts-ignore
LeafletMap.SmoothWheelZoom = Handler.extend({
  addHooks: function () {
    DomEvent.on(this._map._container, "mousewheel", this._onWheelScroll, this);
  },

  removeHooks: function () {
    DomEvent.off(this._map._container, "mousewheel", this._onWheelScroll, this);
  },

  _onWheelScroll: function (e: any) {
    if (!this._isWheeling) {
      this._onWheelStart(e);
    }
    this._onWheeling(e);
  },

  _onWheelStart: function (e: any) {
    var map = this._map;
    this._isWheeling = true;
    this._wheelMousePosition = map.mouseEventToContainerPoint(e);
    this._centerPoint = map.getSize()._divideBy(2);
    this._startLatLng = map.containerPointToLatLng(this._centerPoint);
    this._wheelStartLatLng = map.containerPointToLatLng(
      this._wheelMousePosition
    );
    this._startZoom = map.getZoom();
    this._moved = false;
    this._zooming = true;

    map._stop();
    if (map._panAnim) map._panAnim.stop();

    this._goalZoom = map.getZoom();
    this._prevCenter = map.getCenter();
    this._prevZoom = map.getZoom();

    this._zoomAnimationId = requestAnimationFrame(
      this._updateWheelZoom.bind(this)
    );
  },

  _onWheeling: function (e: any) {
    var map = this._map;

    this._goalZoom =
      this._goalZoom - e.deltaY * 0.003 * map.options.smoothSensitivity;
    if (
      this._goalZoom < map.getMinZoom() ||
      this._goalZoom > map.getMaxZoom()
    ) {
      this._goalZoom = map._limitZoom(this._goalZoom);
    }
    this._wheelMousePosition = this._map.mouseEventToContainerPoint(e);

    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 200);

    DomEvent.preventDefault(e);
    DomEvent.stopPropagation(e);
  },

  _onWheelEnd: function (e: any) {
    this._isWheeling = false;
    cancelAnimationFrame(this._zoomAnimationId);

    // fire zoomend event in order to MarkerCluster plugin rerender clusters
    this._map.fire("zoomend");
  },

  _updateWheelZoom: function () {
    var map = this._map;

    if (
      !map.getCenter().equals(this._prevCenter) ||
      map.getZoom() != this._prevZoom
    )
      return;

    this._zoom = map.getZoom() + (this._goalZoom - map.getZoom()) * 0.3;
    this._zoom = Math.floor(this._zoom * 100) / 100;

    var delta = this._wheelMousePosition.subtract(this._centerPoint);
    if (delta.x === 0 && delta.y === 0) return;

    if (map.options.smoothWheelZoom === "center") {
      this._center = this._startLatLng;
    } else {
      this._center = map.unproject(
        map.project(this._wheelStartLatLng, this._zoom).subtract(delta),
        this._zoom
      );
    }

    if (!this._moved) {
      map._moveStart(true, false);
      this._moved = true;
    }

    map._move(this._center, this._zoom);
    this._prevCenter = map.getCenter();
    this._prevZoom = map.getZoom();

    map.fire("viewreset");

    this._zoomAnimationId = requestAnimationFrame(
      this._updateWheelZoom.bind(this)
    );
  },
});

LeafletMap.addInitHook(
  "addHandler",
  "smoothWheelZoom",
  // @ts-ignore
  LeafletMap.SmoothWheelZoom
);

export interface MapContainerProps extends MapOptions {
  bounds?: LatLngBoundsExpression;
  boundsOptions?: FitBoundsOptions;
  children?: ReactNode;
  className?: string;
  id?: string;
  placeholder?: ReactNode;
  style?: CSSProperties;
  smoothWheelZoom?: boolean;
  smoothSensitivity?: number;
  whenReady?: () => void;
}

function MapContainerComponent<
  Props extends MapContainerProps = MapContainerProps
>(
  {
    bounds,
    boundsOptions,
    center,
    children,
    className,
    id,
    placeholder,
    style,
    whenReady,
    zoom,
    ...options
  }: Props,
  forwardedRef: Ref<LeafletMap | null>
) {
  const [props] = useState({ className, id, style });
  const [context, setContext] = useState<LeafletContextInterface | null>(null);
  useImperativeHandle(forwardedRef, () => context?.map ?? null, [context]);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && context === null) {
      const map = new LeafletMap(node, options);
      if (center != null && zoom != null) {
        map.setView(center, zoom);
      } else if (bounds != null) {
        map.fitBounds(bounds, boundsOptions);
      }
      if (whenReady != null) {
        map.whenReady(whenReady);
      }
      setContext(createLeafletContext(map));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      context?.map.remove();
    };
  }, [context]);

  const contents = context ? (
    <LeafletProvider value={context}>{children}</LeafletProvider>
  ) : (
    placeholder ?? null
  );
  return (
    <div {...props} ref={mapRef}>
      {contents}
    </div>
  );
}

export const MapContainer = forwardRef(MapContainerComponent);
