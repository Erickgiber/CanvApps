import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';

/**
 * Option item schema for UISelect.
 */
export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}

/**
 * Visual styling and configuration for UISelect.
 */
export interface SelectStyles extends VisualStyles {
  options?: Array<SelectOption | string | number>;
  value?: any;
  placeholder?: string;
  color?: string;
  hoverBackgroundColor?: string;
  focusBorderColor?: string;
  arrowColor?: string;
  dropdownBg?: string;
  dropdownHoverBg?: string;
  optionHoverBg?: string;
  optionGap?: number;
  dropdownBorderColor?: string;
  dropdownTextColor?: string;
  dropdownSelectedBg?: string;
  dropdownShadowColor?: string;
  dropdownShadowBlur?: number;
  itemHeight?: number;
  maxDropdownHeight?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  disabled?: boolean;
}

/**
 * High-performance Canvas 2D interactive Select / Dropdown component.
 *
 * Supports reactive option lists, value bindings (:value / v-model), custom dropdown menus,
 * keyboard accessibility, and Ghost DOM semantic synchronization.
 */
export class UISelect extends UIElement {
  public declare styles: SelectStyles;

  private options: SelectOption[] = [];
  private selectedValue: any = undefined;
  private isOpen = false;
  private hoveredOptionIndex = -1;

  constructor(styles: SelectStyles = {}) {
    super({
      width: 140,
      height: 38,
      backgroundColor: '#162032',
      color: '#f1f5f9',
      borderColor: '#1e293b',
      borderWidth: 1,
      borderRadius: 8,
      padding: [8, 12],
      fontSize: 13,
      fontWeight: '600',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      cursor: 'pointer',
      arrowColor: '#94a3b8',
      dropdownBg: '#0d131f',
      dropdownHoverBg: '#f1f5f9',
      optionGap: 2,
      dropdownBorderColor: '#334155',
      dropdownTextColor: '#f1f5f9',
      dropdownSelectedBg: '#0284c7',
      dropdownShadowColor: 'rgba(0, 0, 0, 0.14)',
      dropdownShadowBlur: 12,
      itemHeight: 32,
      maxDropdownHeight: 200,
      ...styles,
    });

    if (styles.options) {
      this.setOptions(styles.options);
    }
    if (styles.value !== undefined) {
      this.setValue(styles.value);
    }

    this.setupEvents();
  }

  public getGhostType(): 'select' {
    return 'select';
  }

  public getOptions(): SelectOption[] {
    return this.options;
  }

  public setOptions(options: Array<SelectOption | string | number>): this {
    this.options = (options || []).map((opt) => {
      if (typeof opt === 'object' && opt !== null && 'value' in opt) {
        return {
          label: String(opt.label ?? opt.value),
          value: opt.value,
          disabled: Boolean(opt.disabled),
        };
      }
      return {
        label: String(opt),
        value: opt,
      };
    });

    this.styles.options = this.options;
    this.markRenderDirty();
    return this;
  }

  public getValue(): any {
    return this.selectedValue;
  }

  public setValue(val: any): this {
    if (this.selectedValue !== val) {
      this.selectedValue = val;
      this.styles.value = val;
      this.markRenderDirty();
    }
    return this;
  }

  public getSelectedOption(): SelectOption | undefined {
    return this.options.find((opt) => opt.value === this.selectedValue);
  }

  public setPlaceholder(placeholder: string): this {
    this.styles.placeholder = placeholder;
    this.markRenderDirty();
    return this;
  }

  public isDropdownOpen(): boolean {
    return this.isOpen;
  }

  public openDropdown(): void {
    if (this.styles.disabled) return;
    if (UIElement.activeOpenSelect && UIElement.activeOpenSelect !== this) {
      (UIElement.activeOpenSelect as UISelect).closeDropdown();
    }
    this.isOpen = true;
    UIElement.activeOpenSelect = this;
    this.markRenderDirty();
  }

  public closeDropdown(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.hoveredOptionIndex = -1;
      if (UIElement.activeOpenSelect === this) {
        UIElement.activeOpenSelect = null;
      }
      this.markRenderDirty();
    }
  }

  public toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private setupEvents(): void {
    this.on('pointerdown', (e: any) => {
      if (this.styles.disabled) return;
      e.stopPropagation?.();

      const localY = typeof e.y === 'number' ? e.y - this.worldRect.y : (e.offsetY ?? 0);
      const { height } = this.layoutRect;

      if (!this.isOpen) {
        this.openDropdown();
        return;
      }

      // If open, check if clicked on main field or on dropdown items
      if (localY <= height) {
        this.closeDropdown();
      } else {
        const itemH = this.styles.itemHeight || 32;
        const gap = this.styles.optionGap ?? 2;
        const slotH = itemH + gap;
        const relativeY = localY - height - 4 - 3;

        if (relativeY >= 0) {
          const clickedIndex = Math.floor(relativeY / slotH);
          const withinSlotY = relativeY % slotH;
          if (clickedIndex >= 0 && clickedIndex < this.options.length && withinSlotY <= itemH) {
            const option = this.options[clickedIndex];
            if (!option.disabled) {
              this.selectOption(option);
            }
          }
        }
      }
    });

    this.on('pointermove', (e: any) => {
      if (!this.isOpen) return;
      const localY = typeof e.y === 'number' ? e.y - this.worldRect.y : (e.offsetY ?? 0);
      const { height } = this.layoutRect;
      const itemH = this.styles.itemHeight || 32;
      const gap = this.styles.optionGap ?? 2;
      const slotH = itemH + gap;
      const relativeY = localY - height - 4 - 3;

      if (relativeY >= 0) {
        const hoverIndex = Math.floor(relativeY / slotH);
        const withinSlotY = relativeY % slotH;
        if (hoverIndex >= 0 && hoverIndex < this.options.length && withinSlotY <= itemH) {
          if (this.hoveredOptionIndex !== hoverIndex) {
            this.hoveredOptionIndex = hoverIndex;
            this.markRenderDirty();
          }
          return;
        }
      }
      if (this.hoveredOptionIndex !== -1) {
        this.hoveredOptionIndex = -1;
        this.markRenderDirty();
      }
    });

    this.on('pointerleave', () => {
      if (this.hoveredOptionIndex !== -1) {
        this.hoveredOptionIndex = -1;
        this.markRenderDirty();
      }
    });
  }

  private selectOption(option: SelectOption): void {
    this.setValue(option.value);
    this.closeDropdown();
    this.emit('change', { value: option.value, option });
    this.emit('input', { value: option.value, option });
    this.emit('click', { value: option.value, option });
  }

  /**
   * Hit test override to ensure dropdown menu captures pointer events when open.
   */
  public hitTest(worldX: number, worldY: number): UIElement | null {
    if (!this.visible || this.styles.display === 'none') {
      return null;
    }

    const { x, y, width, height } = this.worldRect;
    let totalHeight = height;

    if (this.isOpen) {
      const itemH = this.styles.itemHeight || 32;
      const gap = this.styles.optionGap ?? 2;
      const dropdownHeight = Math.min(
        this.options.length * itemH + Math.max(0, this.options.length - 1) * gap + 6,
        this.styles.maxDropdownHeight || 200
      );
      totalHeight += dropdownHeight + 6;
    }

    if (
      worldX >= x &&
      worldX <= x + width &&
      worldY >= y &&
      worldY <= y + totalHeight
    ) {
      return this;
    }

    return null;
  }

  /**
   * Paint pass for UISelect and floating dropdown list.
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) return;

    const {
      backgroundColor = '#162032',
      borderColor = '#1e293b',
      borderWidth = 1,
      borderRadius = 8,
      color = '#f1f5f9',
      fontSize = 13,
      fontWeight = '600',
      fontFamily = 'system-ui, -apple-system, sans-serif',
      arrowColor = '#94a3b8',
      placeholder = 'Seleccionar...',
      disabled = false,
      boxShadow,
    } = this.styles;

    ctx.save();

    if (boxShadow && !disabled) {
      ctx.save();
      ctx.shadowColor = boxShadow.color;
      ctx.shadowBlur = boxShadow.blur;
      ctx.shadowOffsetX = boxShadow.offsetX;
      ctx.shadowOffsetY = boxShadow.offsetY;
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    this.applyPath(ctx, 0, 0, width, height, borderRadius);
    ctx.fillStyle = disabled ? '#334155' : (this.isHovered ? (this.styles.hoverBackgroundColor || backgroundColor) : backgroundColor);
    ctx.fill();

    if (borderWidth > 0 && borderColor) {
      ctx.strokeStyle = this.isOpen ? (this.styles.focusBorderColor || '#0284c7') : borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    const selected = this.getSelectedOption();
    const displayLabel = selected ? selected.label : placeholder;
    const textColor = selected ? color : '#64748b';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = disabled ? '#94a3b8' : textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const pad = this.styles.padding;
    let paddingLeft = 12;
    let paddingRight = 12;
    if (Array.isArray(pad)) {
      if (pad.length === 4) {
        paddingRight = pad[1] ?? 12;
        paddingLeft = pad[3] ?? 12;
      } else if (pad.length === 2) {
        paddingRight = pad[1] ?? 12;
        paddingLeft = pad[1] ?? 12;
      }
    } else if (typeof pad === 'number') {
      paddingLeft = pad;
      paddingRight = pad;
    }

    const arrowX = width - Math.max(10, paddingRight + 2);
    const maxTextW = Math.max(0, arrowX - 6 - paddingLeft);

    ctx.save();
    ctx.beginPath();
    ctx.rect(paddingLeft, 0, maxTextW, height);
    ctx.clip();
    ctx.fillText(displayLabel, paddingLeft, height / 2);
    ctx.restore();

    const arrowY = height / 2;
    ctx.beginPath();
    ctx.strokeStyle = disabled ? '#64748b' : arrowColor;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.isOpen) {
      // Up Chevron
      ctx.moveTo(arrowX - 4, arrowY + 2);
      ctx.lineTo(arrowX, arrowY - 2);
      ctx.lineTo(arrowX + 4, arrowY + 2);
    } else {
      // Down Chevron
      ctx.moveTo(arrowX - 4, arrowY - 2);
      ctx.lineTo(arrowX, arrowY + 2);
      ctx.lineTo(arrowX + 4, arrowY - 2);
    }
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Top-layer floating dropdown rendering pass (drawn in Engine over entire scene).
   */
  public drawDropdown(ctx: CanvasRenderingContext2D): void {
    if (!this.isOpen || this.options.length === 0) return;

    const { x, y, width, height } = this.worldRect;
    const {
      fontSize = 13,
      fontWeight = '600',
      fontFamily = 'system-ui, -apple-system, sans-serif',
      dropdownBg = '#0d131f',
      dropdownHoverBg,
      optionHoverBg,
      optionGap = 2,
      dropdownBorderColor = '#334155',
      dropdownTextColor = '#f1f5f9',
      dropdownSelectedBg = '#0284c7',
      dropdownShadowColor = 'rgba(0, 0, 0, 0.14)',
      dropdownShadowBlur = 12,
      itemHeight = 32,
      maxDropdownHeight = 200,
    } = this.styles;

    const hoverBg = optionHoverBg || dropdownHoverBg || '#f1f5f9';
    const isLightHover = hoverBg === '#f1f5f9' || hoverBg === '#ffffff' || hoverBg === '#e2e8f0' || hoverBg === '#f8fafc';
    const dropX = x;
    const dropY = y + height + 4;
    const dropHeight = Math.min(
      this.options.length * itemHeight + Math.max(0, this.options.length - 1) * optionGap + 6,
      maxDropdownHeight
    );

    ctx.save();

    // Dropdown Box Shadow (Subtle, soft modern shadow)
    ctx.shadowColor = dropdownShadowColor;
    ctx.shadowBlur = dropdownShadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Dropdown Container Background & Border
    ctx.beginPath();
    this.applyPath(ctx, dropX, dropY, width, dropHeight, 8);
    ctx.fillStyle = dropdownBg;
    ctx.fill();
    ctx.strokeStyle = dropdownBorderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    // Render Dropdown Items with gap
    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      const itemY = dropY + 3 + i * (itemHeight + optionGap);
      const isHovered = this.hoveredOptionIndex === i;
      const isSelected = option.value === this.selectedValue;

      // Item background highlight
      if (isSelected) {
        ctx.beginPath();
        this.applyPath(ctx, dropX + 4, itemY, width - 8, itemHeight, 6);
        ctx.fillStyle = dropdownSelectedBg;
        ctx.fill();
      } else if (isHovered) {
        ctx.beginPath();
        this.applyPath(ctx, dropX + 4, itemY, width - 8, itemHeight, 6);
        ctx.fillStyle = hoverBg;
        ctx.fill();
      }

      // Item Label Text
      ctx.font = `${isSelected ? 'bold' : fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = isSelected
        ? '#ffffff'
        : (option.disabled
            ? '#64748b'
            : (isHovered && isLightHover ? '#0f172a' : dropdownTextColor));
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(option.label, dropX + 12, itemY + itemHeight / 2);

      // Checkmark for selected item
      if (isSelected) {
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText('✓', dropX + width - 12, itemY + itemHeight / 2);
      }
    }
    ctx.restore();
  }
}
