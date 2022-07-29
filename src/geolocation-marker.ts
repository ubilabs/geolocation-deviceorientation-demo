const MARKER_SVG = `<?xml version="1.0" encoding="UTF-8" ?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="-16 -16 32 32" fill="#5a78fa">
    <style>
        .no-heading .heading-arrow {
            display: none;
        }
    </style>
    <circle r="5" fill="#5a78fa" />
    <circle r="6.5" stroke-width="1" stroke="#5a78fa" fill="none" />
    <path class="heading-arrow" d="M-3-9l3-5l3,5z" stroke="#5a78fa" stroke-linejoin="round" />
</svg>
`;

export class GeolocationMarker {
  protected overlay: google.maps.OverlayView;

  protected rootEl!: HTMLDivElement;
  private iconSvgEl!: SVGSVGElement;
  private accuracyIndicator!: HTMLElement;

  private _position: google.maps.LatLngLiteral | null = null;
  private _heading: number | null = 0;
  private _size: number = 48;
  private _accuracy: number | null = null;
  private _drawScheduled: any;

  constructor() {
    this.overlay = new google.maps.OverlayView();
    this.overlay.onAdd = () => this.onAdd();
    this.overlay.onRemove = () => this.onRemove();
    this.overlay.draw = () => this.draw();

    this.createDomElements();
  }

  set position(position: google.maps.LatLngLiteral | null) {
    this._position = position;
    this.scheduleDraw();
  }

  get position(): google.maps.LatLngLiteral | null {
    return this._position;
  }

  set heading(orientation: number | null) {
    this._heading = orientation;
    this.scheduleDraw();
  }

  get heading(): number | null {
    return this._heading;
  }

  set accuracy(accuracy: number | null) {
    this._accuracy = accuracy;
    this.scheduleDraw();
  }

  get accuracy(): number | null {
    return this._accuracy;
  }

  set size(size: number) {
    this._size = size;
  }

  get size(): number {
    return this._size;
  }

  setMap(map: google.maps.Map | null) {
    this.overlay.setMap(map);
  }

  getMap(): google.maps.Map | null {
    return this.overlay.getMap() as any;
  }

  protected createDomElements() {
    this.rootEl = document.createElement('div');
    this.rootEl.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: var(--size);
      height: var(--size);
    `;

    this.accuracyIndicator = document.createElement('div');
    this.accuracyIndicator.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      width: var(--accuracy); height: var(--accuracy);
      transform: translate(-50%, -50%);
      border: 1px solid currentColor;
      background: rgba(0,0,0,0.2);
      border-radius: 50%;
    `;
    this.rootEl.appendChild(this.accuracyIndicator);

    this.iconSvgEl = this.createIconSvgElement();
    this.iconSvgEl.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    `;

    this.rootEl.appendChild(this.iconSvgEl);
  }

  protected updateDomElements() {
    this.updatePositionAndSize();
    this.updateOrientation();
    this.updateAccuracy();
  }

  protected onAdd() {
    const panes = this.overlay.getPanes()!;
    panes.overlayLayer.appendChild(this.rootEl);
  }

  protected scheduleDraw() {
    if (this._drawScheduled) return;

    this._drawScheduled = true;
    queueMicrotask(() => {
      this._drawScheduled = false;
      this.overlay.draw();
    });
  }

  protected draw() {
    const projection = this.overlay.getProjection();
    if (!projection) return;

    this.rootEl.style.display = this._position === null ? 'none' : '';
    if (!this._position) return;

    this.updateDomElements();
  }

  protected onRemove() {
    this.rootEl.remove();
  }

  private createIconSvgElement() {
    const parser = new DOMParser();
    const svgDocument = parser.parseFromString(MARKER_SVG, 'image/svg+xml');

    return this.rootEl.ownerDocument.adoptNode(
      svgDocument.firstChild as SVGSVGElement
    );
  }

  private updatePositionAndSize() {
    const projection = this.overlay.getProjection()!;
    const {x, y} = projection.fromLatLngToDivPixel(this._position)!;

    this.rootEl.style.setProperty('--size', this._size + 'px');
    this.rootEl.style.transform = `translate(${x - this._size / 2}px, ${
      y - this._size / 2
    }px)`;
  }

  private updateOrientation() {
    const hasHeading = this._heading !== null && !isNaN(this._heading);

    this.iconSvgEl.classList.toggle('no-heading', !hasHeading);
    this.iconSvgEl.style.transform = `rotate(${this._heading}deg)`;
  }

  private updateAccuracy() {
    const projection = this.overlay.getProjection();

    if (!projection) return;

    const {lat} = this._position!;

    if (this._accuracy === null) {
      this.accuracyIndicator.style.display = 'none';
      return;
    }

    const circumferenceAtLatitude = 40e6 * Math.cos(lat * (Math.PI / 180));
    const pxPerMeter = projection.getWorldWidth() / circumferenceAtLatitude;
    const diameterPx = 2 * this._accuracy * pxPerMeter;

    this.accuracyIndicator.style.display = diameterPx < 40 ? 'none' : '';
    this.accuracyIndicator.style.setProperty('--accuracy', diameterPx + 'px');
  }
}
