/**
 * BlogEditor – design system (ported from BlogXtender 2.0)
 * All style functions return React.CSSProperties objects.
 */
import { CSSProperties } from 'react';

// ── Design tokens ────────────────────────────────────────────────────────────

const C = {
  purple:       '#7c3aed',
  purpleHover:  '#6d28d9',
  purpleLight:  '#f5f3ff',
  purpleBorder: '#ddd6fe',
  white:        '#ffffff',
  gray50:       '#f9fafb',
  gray100:      '#f3f4f6',
  gray200:      '#e5e7eb',
  gray300:      '#d1d5db',
  gray400:      '#9ca3af',
  gray500:      '#6b7280',
  gray700:      '#374151',
  gray900:      '#111827',
};

// ── Header ───────────────────────────────────────────────────────────────────

export const headerBar = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  height: '52px',
  borderBottom: `1px solid ${C.gray200}`,
  backgroundColor: C.white,
  flexShrink: 0,
});

export const headerLeft = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
});

export const headerRight = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const logoText = (): CSSProperties => ({
  fontSize: '17px',
  fontWeight: '700',
  color: C.purple,
  letterSpacing: '-0.3px',
  fontFamily: 'Georgia, serif',
  userSelect: 'none',
});

export const modeToggleGroup = (): CSSProperties => ({
  display: 'flex',
  borderRadius: '7px',
  border: `1px solid ${C.gray200}`,
  overflow: 'hidden',
});

export const modeToggleBtn = (active: boolean): CSSProperties => ({
  padding: '5px 14px',
  fontSize: '13px',
  fontWeight: '500',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: active ? C.purple : 'transparent',
  color: active ? C.white : C.gray500,
  transition: 'background-color 0.15s, color 0.15s',
  lineHeight: '1.4',
});

export const exportBtn = (): CSSProperties => ({
  padding: '6px 16px',
  fontSize: '13px',
  fontWeight: '600',
  backgroundColor: C.purple,
  color: C.white,
  border: 'none',
  borderRadius: '7px',
  cursor: 'pointer',
  lineHeight: '1.4',
});

// ── Toolbar ──────────────────────────────────────────────────────────────────

export const toolbarBar = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1px',
  padding: '5px 10px',
  borderBottom: `1px solid ${C.gray200}`,
  backgroundColor: C.gray50,
  flexShrink: 0,
  position: 'relative',
  userSelect: 'none',
});

export const toolbarBtn = (active?: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '28px',
  height: '26px',
  padding: '0 5px',
  fontSize: '12px',
  fontWeight: '500',
  fontFamily: 'inherit',
  backgroundColor: active ? C.purpleLight : 'transparent',
  color: active ? C.purple : C.gray700,
  border: `1px solid ${active ? C.purpleBorder : 'transparent'}`,
  borderRadius: '5px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  lineHeight: '1',
  transition: 'background-color 0.1s',
});

export const toolbarBtnFmt = (style?: CSSProperties): CSSProperties => ({
  ...toolbarBtn(),
  ...style,
});

export const toolbarDivider = (): CSSProperties => ({
  width: '1px',
  height: '18px',
  backgroundColor: C.gray300,
  margin: '0 3px',
  flexShrink: 0,
});

export const toolbarIndentInput = (): CSSProperties => ({
  width: '34px',
  height: '24px',
  fontSize: '11px',
  textAlign: 'center',
  border: `1px solid ${C.gray300}`,
  borderRadius: '4px',
  padding: '0 3px',
  color: C.gray700,
  backgroundColor: C.white,
});

export const toolbarLabel = (): CSSProperties => ({
  fontSize: '11px',
  color: C.gray500,
  padding: '0 2px',
  whiteSpace: 'nowrap',
});

// ── Popovers (link & special chars) ─────────────────────────────────────────

export const popoverWrapper = (): CSSProperties => ({
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  zIndex: 200,
  backgroundColor: C.white,
  border: `1px solid ${C.gray200}`,
  borderRadius: '8px',
  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
  padding: '8px',
});

export const linkPopoverInner = (): CSSProperties => ({
  ...popoverWrapper(),
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: '300px',
});

export const linkPopoverInput = (): CSSProperties => ({
  flex: 1,
  padding: '6px 10px',
  fontSize: '13px',
  border: `1px solid ${C.gray200}`,
  borderRadius: '6px',
  outline: 'none',
  color: C.gray900,
});

export const linkConfirmBtn = (): CSSProperties => ({
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: '600',
  backgroundColor: C.purple,
  color: C.white,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  flexShrink: 0,
});

export const linkCancelBtn = (): CSSProperties => ({
  padding: '6px 8px',
  fontSize: '12px',
  backgroundColor: 'transparent',
  color: C.gray500,
  border: `1px solid ${C.gray200}`,
  borderRadius: '6px',
  cursor: 'pointer',
  flexShrink: 0,
});

export const specialCharsDropdown = (): CSSProperties => ({
  ...popoverWrapper(),
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '4px',
  width: '180px',
});

export const specialCharBtn = (): CSSProperties => ({
  padding: '5px',
  fontSize: '14px',
  textAlign: 'center',
  backgroundColor: C.gray50,
  border: `1px solid ${C.gray200}`,
  borderRadius: '4px',
  cursor: 'pointer',
  color: C.gray700,
});

// ── Content area ─────────────────────────────────────────────────────────────

export const contentArea = (): CSSProperties => ({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
  minHeight: 0,
});

// ── Editor ───────────────────────────────────────────────────────────────────

export const editorWrapper = (): CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
});

export const editorTextarea = (): CSSProperties => ({
  flex: 1,
  width: '100%',
  padding: '20px 28px',
  fontSize: '14px',
  lineHeight: '1.7',
  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  border: 'none',
  outline: 'none',
  backgroundColor: C.white,
  color: C.gray900,
  overflowY: 'auto',
});

export const previewArea = (): CSSProperties => ({
  flex: 1,
  padding: '28px 40px',
  overflow: 'auto',
  fontSize: '16px',
  lineHeight: '1.8',
  fontFamily: 'Georgia, "Times New Roman", serif',
  color: C.gray900,
  backgroundColor: C.white,
});

// ── Sidebar ──────────────────────────────────────────────────────────────────

export const sidebarContainer = (open: boolean): CSSProperties => ({
  width: open ? '300px' : '0',
  flexShrink: 0,
  overflow: 'hidden',
  borderLeft: open ? `1px solid ${C.gray200}` : 'none',
  backgroundColor: C.white,
  transition: 'width 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
});

export const sidebarHeader = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  borderBottom: `1px solid ${C.gray200}`,
  flexShrink: 0,
  minWidth: '300px',
});

export const sidebarTitle = (): CSSProperties => ({
  fontSize: '12px',
  fontWeight: '700',
  color: C.gray700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const sidebarCloseBtn = (): CSSProperties => ({
  width: '22px',
  height: '22px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  backgroundColor: 'transparent',
  color: C.gray400,
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: '14px',
  lineHeight: '1',
});

export const sidebarContent = (): CSSProperties => ({
  flex: 1,
  overflow: 'auto',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  minWidth: '300px',
});

// ── Sidebar form elements ─────────────────────────────────────────────────────

export const sidebarLabel = (): CSSProperties => ({
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  color: C.gray500,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '4px',
});

export const sidebarInput = (): CSSProperties => ({
  width: '100%',
  padding: '7px 10px',
  fontSize: '13px',
  border: `1px solid ${C.gray200}`,
  borderRadius: '6px',
  outline: 'none',
  color: C.gray900,
  backgroundColor: C.white,
  fontFamily: 'inherit',
});

export const sidebarTextarea = (): CSSProperties => ({
  width: '100%',
  padding: '7px 10px',
  fontSize: '13px',
  border: `1px solid ${C.gray200}`,
  borderRadius: '6px',
  outline: 'none',
  color: C.gray900,
  backgroundColor: C.white,
  fontFamily: 'inherit',
  minHeight: '80px',
  resize: 'vertical',
});

export const sidebarButton = (): CSSProperties => ({
  padding: '7px 14px',
  fontSize: '13px',
  fontWeight: '600',
  backgroundColor: C.purple,
  color: C.white,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  alignSelf: 'flex-start',
  lineHeight: '1.4',
});

export const sidebarSecondaryButton = (): CSSProperties => ({
  padding: '7px 14px',
  fontSize: '13px',
  fontWeight: '500',
  backgroundColor: C.gray100,
  color: C.gray700,
  border: `1px solid ${C.gray200}`,
  borderRadius: '6px',
  cursor: 'pointer',
  lineHeight: '1.4',
});

export const sidebarDivider = (): CSSProperties => ({
  height: '1px',
  backgroundColor: C.gray200,
  margin: '2px 0',
});

export const sidebarRadioGroup = (): CSSProperties => ({
  display: 'flex',
  gap: '14px',
  alignItems: 'center',
  fontSize: '13px',
  color: C.gray700,
});

export const sidebarFieldset = (): CSSProperties => ({
  border: `1px solid ${C.gray200}`,
  borderRadius: '8px',
  padding: '12px',
  margin: '0',
});

export const sidebarFieldsetLegend = (): CSSProperties => ({
  fontSize: '11px',
  fontWeight: '600',
  color: C.gray500,
  padding: '0 6px',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
});

export const sidebarRow = (): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const imagePreviewStrip = (): CSSProperties => ({
  width: '100%',
  minHeight: '56px',
  padding: '6px',
  border: `1px solid ${C.gray200}`,
  borderRadius: '6px',
  overflow: 'auto',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  backgroundColor: C.gray50,
});

export const sidebarButtonRow = (): CSSProperties => ({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
});

// ── Color picker ─────────────────────────────────────────────────────────────

export const colorPickerWrapper = (): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const colorPickerRow = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const colorHexInput = (): CSSProperties => ({
  width: '80px',
  padding: '5px 8px',
  fontSize: '12px',
  border: `1px solid ${C.gray200}`,
  borderRadius: '5px',
  fontFamily: 'monospace',
  color: C.gray700,
  outline: 'none',
});

export const colorSwatchRow = (): CSSProperties => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '3px',
});

export const colorSwatch = (bg: string): CSSProperties => ({
  width: '20px',
  height: '20px',
  backgroundColor: bg ? `#${bg}` : 'transparent',
  border: bg ? `1px solid ${C.gray300}` : `1px dashed ${C.gray300}`,
  borderRadius: '3px',
  cursor: 'pointer',
  flexShrink: 0,
});

// ── Export modal ─────────────────────────────────────────────────────────────

export const modalOverlay = (): CSSProperties => ({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
});

export const modalBox = (): CSSProperties => ({
  backgroundColor: C.white,
  borderRadius: '12px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  width: '720px',
  maxWidth: '95vw',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const modalHead = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: `1px solid ${C.gray200}`,
  flexShrink: 0,
});

export const modalTitle = (): CSSProperties => ({
  fontSize: '15px',
  fontWeight: '700',
  color: C.gray900,
});

export const modalCloseBtn = (): CSSProperties => ({
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  backgroundColor: 'transparent',
  color: C.gray400,
  cursor: 'pointer',
  borderRadius: '6px',
  fontSize: '16px',
});

export const modalTabBar = (): CSSProperties => ({
  display: 'flex',
  borderBottom: `1px solid ${C.gray200}`,
  padding: '0 20px',
  gap: '2px',
  flexShrink: 0,
  backgroundColor: C.gray50,
});

export const modalTab = (active: boolean): CSSProperties => ({
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: active ? '600' : '400',
  color: active ? C.purple : C.gray500,
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: active ? `2px solid ${C.purple}` : '2px solid transparent',
  cursor: 'pointer',
  marginBottom: '-1px',
  whiteSpace: 'nowrap',
});

export const modalBody = (): CSSProperties => ({
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  padding: '16px 20px',
  gap: '12px',
  minHeight: 0,
});

export const modalCode = (): CSSProperties => ({
  flex: 1,
  width: '100%',
  padding: '12px',
  fontSize: '12px',
  fontFamily: '"SFMono-Regular", Consolas, monospace',
  lineHeight: '1.6',
  border: `1px solid ${C.gray200}`,
  borderRadius: '8px',
  backgroundColor: C.gray50,
  color: C.gray900,
  resize: 'none',
  outline: 'none',
  overflowY: 'auto',
  minHeight: '0',
});

export const modalFooter = (): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  borderTop: `1px solid ${C.gray200}`,
  flexShrink: 0,
  backgroundColor: C.gray50,
});

export const copyBtn = (copied: boolean): CSSProperties => ({
  padding: '8px 20px',
  fontSize: '13px',
  fontWeight: '600',
  backgroundColor: copied ? '#059669' : C.purple,
  color: C.white,
  border: 'none',
  borderRadius: '7px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
});

export const charCount = (): CSSProperties => ({
  fontSize: '12px',
  color: C.gray400,
});
