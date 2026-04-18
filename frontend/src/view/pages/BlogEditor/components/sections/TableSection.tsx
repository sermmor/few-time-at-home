import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import { makeTable } from '../../utils/insertionUtils';
import * as S from '../../BlogEditorCss';

const TableSection: React.FC = () => {
  const { insertCode } = useEditor();
  const [rows, setRows] = useState('');
  const [cols, setCols] = useState('');

  const handleOk = () => {
    const numRows = parseInt(rows, 10);
    const numCols = parseInt(cols, 10);
    if (!isNaN(numRows) && !isNaN(numCols) && numRows > 0 && numCols > 0) {
      insertCode('', makeTable(numRows, numCols));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Rows</label>
        <input type="number" min="1" style={S.sidebarInput()} value={rows}
          onChange={(e) => setRows(e.target.value)} placeholder="e.g. 3" />
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Columns</label>
        <input type="number" min="1" style={S.sidebarInput()} value={cols}
          onChange={(e) => setCols(e.target.value)} placeholder="e.g. 4" />
      </div>
      <button style={S.sidebarButton()} onClick={handleOk}>Insert Table</button>
    </div>
  );
};

export default TableSection;
