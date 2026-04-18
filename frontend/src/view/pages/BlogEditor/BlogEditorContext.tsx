import React, { createContext, useContext, useRef, useCallback, RefObject } from 'react';

interface EditorContextType {
  textareaRef: RefObject<HTMLTextAreaElement>;
  insertCode: (initTag: string, endTag: string) => void;
  extractSelectedText: () => string;
  substituteSelectionWithText: (text: string) => void;
  setSelRange: (start: number, end: number) => void;
  getContent: () => string;
}

const EditorContext = createContext<EditorContextType | null>(null);

export const useEditor = (): EditorContextType => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
};

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getContent = useCallback((): string => {
    return textareaRef.current?.value ?? '';
  }, []);

  const setSelRange = useCallback((start: number, end: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(start, end);
  }, []);

  const insertCode = useCallback((initTag: string, endTag: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;
    const before = ta.value.substring(0, selStart);
    const selected = ta.value.substring(selStart, selEnd);
    const after = ta.value.substring(selEnd);
    const newValue = before + initTag + selected + endTag + after;
    const newCursorPos = selStart + initTag.length + selected.length + endTag.length;
    ta.value = newValue;
    ta.focus();
    ta.setSelectionRange(newCursorPos, newCursorPos);
  }, []);

  const extractSelectedText = useCallback((): string => {
    const ta = textareaRef.current;
    if (!ta) return '';
    return ta.value.substring(ta.selectionStart, ta.selectionEnd);
  }, []);

  const substituteSelectionWithText = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selStart = ta.selectionStart;
    const before = ta.value.substring(0, selStart);
    const after = ta.value.substring(ta.selectionEnd);
    const newValue = before + text + after;
    const newCursorPos = selStart + text.length;
    ta.value = newValue;
    ta.focus();
    ta.setSelectionRange(newCursorPos, newCursorPos);
  }, []);

  return (
    <EditorContext.Provider value={{
      textareaRef,
      insertCode,
      extractSelectedText,
      substituteSelectionWithText,
      setSelRange,
      getContent,
    }}>
      {children}
    </EditorContext.Provider>
  );
};
