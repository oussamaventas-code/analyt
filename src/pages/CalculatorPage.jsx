import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, FileText, Download, Copy, FileSpreadsheet, X, Check } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

const STORAGE_KEY = 'metashop_calculator_sheets';

const TEMPLATES = {
  blank: {
    nameKey: 'calc.templateBlank',
    columns: ['A', 'B', 'C', 'D', 'E'],
    headers: ['', '', '', '', ''],
    rows: Array.from({ length: 10 }, () => Array(5).fill('')),
  },
  campaignROAS: {
    nameKey: 'calc.templateCampaignROAS',
    columns: ['A', 'B', 'C', 'D', 'E', 'F'],
    headers: ['Campaña', 'Gasto', 'Ingresos', 'Pedidos', 'ROAS', 'CPA'],
    rows: [
      ['Conversiones Mayo', '450', '1800', '24', '=C2/B2', '=B2/D2'],
      ['Remarketing', '180', '720', '12', '=C3/B3', '=B3/D3'],
      ['Lookalike 1%', '320', '960', '15', '=C4/B4', '=B4/D4'],
      ['DPA Catálogo', '210', '630', '9', '=C5/B5', '=B5/D5'],
      ['', '', '', '', '', ''],
      ['TOTAL', '=SUMA(B2:B5)', '=SUMA(C2:C5)', '=SUMA(D2:D5)', '=C7/B7', '=B7/D7'],
    ],
  },
  scaling: {
    nameKey: 'calc.templateScaling',
    columns: ['A', 'B', 'C', 'D', 'E'],
    headers: ['Escenario', 'Gasto/día', 'ROAS esperado', 'Ingresos/día', 'Beneficio/día'],
    rows: [
      ['Actual', '50', '3.0', '=B2*C2', '=D2-B2'],
      ['+20%', '=B2*1.2', '2.8', '=B3*C3', '=D3-B3'],
      ['+50%', '=B2*1.5', '2.5', '=B4*C4', '=D4-B4'],
      ['+100%', '=B2*2', '2.2', '=B5*C5', '=D5-B5'],
      ['+200%', '=B2*3', '1.9', '=B6*C6', '=D6-B6'],
    ],
  },
  productMargin: {
    nameKey: 'calc.templateProductMargin',
    columns: ['A', 'B', 'C', 'D', 'E', 'F'],
    headers: ['Producto', 'PVP', 'Coste', 'Envío', 'Beneficio', 'Margen %'],
    rows: [
      ['Producto A', '49.99', '12', '3.5', '=B2-C2-D2', '=E2/B2*100'],
      ['Producto B', '29.99', '8', '3.5', '=B3-C3-D3', '=E3/B3*100'],
      ['Producto C', '79.99', '20', '5', '=B4-C4-D4', '=E4/B4*100'],
      ['Producto D', '19.99', '5', '3', '=B5-C5-D5', '=E5/B5*100'],
    ],
  },
};

// Convert column index to letter (0 -> A, 1 -> B, ..., 26 -> AA)
function colIndexToLetter(i) {
  let s = '';
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

// Convert column letter to index (A -> 0, B -> 1, ...)
function colLetterToIndex(letter) {
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64);
  }
  return n - 1;
}

// Parse cell ref like "A1" -> {col: 0, row: 0}
function parseRef(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { col: colLetterToIndex(m[1]), row: parseInt(m[2]) - 1 };
}

// Evaluate a formula string, given the current rows
function evaluateFormula(formula, rows, columnsCount, depth = 0) {
  if (depth > 50) return '#REF';
  if (!formula || typeof formula !== 'string') return formula;
  const trimmed = formula.trim();
  if (!trimmed.startsWith('=')) return formula;

  let expr = trimmed.slice(1);

  // SUMA / SUM range: SUMA(A1:A5) or SUM(A1:A5)
  expr = expr.replace(/(?:SUMA|SUM|PROMEDIO|AVG|AVERAGE)\(([A-Z]+\d+):([A-Z]+\d+)\)/gi, (match, from, to, offset, str) => {
    const fnName = match.split('(')[0].toUpperCase();
    const a = parseRef(from);
    const b = parseRef(to);
    if (!a || !b) return '0';
    const values = [];
    for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
        if (rows[r] && rows[r][c] !== undefined) {
          const cell = rows[r][c];
          const v = parseFloat(evaluateFormula(cell, rows, columnsCount, depth + 1));
          if (!isNaN(v)) values.push(v);
        }
      }
    }
    if (fnName === 'SUMA' || fnName === 'SUM') return values.reduce((a, b) => a + b, 0).toString();
    if (values.length === 0) return '0';
    return (values.reduce((a, b) => a + b, 0) / values.length).toString();
  });

  // Replace cell refs (A1, B2, etc) with their values
  expr = expr.replace(/([A-Z]+)(\d+)/g, (match, letter, num) => {
    const col = colLetterToIndex(letter);
    const row = parseInt(num) - 1;
    if (rows[row] && rows[row][col] !== undefined) {
      const cell = rows[row][col];
      const v = evaluateFormula(cell, rows, columnsCount, depth + 1);
      const num = parseFloat(v);
      return isNaN(num) ? '0' : num.toString();
    }
    return '0';
  });

  try {
    // Safe eval: only allow numbers and basic operators
    if (!/^[\d\s+\-*/.()%]+$/.test(expr)) return '#ERR';
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')();
    if (!isFinite(result)) return '#DIV/0';
    return Math.round(result * 10000) / 10000;
  } catch {
    return '#ERR';
  }
}

function makeSheetFromTemplate(templateKey, name) {
  const tpl = TEMPLATES[templateKey];
  return {
    id: `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name || 'Hoja sin título',
    headers: [...tpl.headers],
    rows: tpl.rows.map(r => [...r]),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadSheets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSheets(sheets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  } catch {}
}

export default function CalculatorPage() {
  const { t, lang } = useTranslation();
  const [sheets, setSheets] = useState(() => loadSheets() || [makeSheetFromTemplate('campaignROAS', 'ROAS por campaña')]);
  const [activeSheetId, setActiveSheetId] = useState(() => {
    const s = loadSheets();
    return (s && s[0]?.id) || null;
  });
  const [editingCell, setEditingCell] = useState(null); // {row, col}
  const [editValue, setEditValue] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef(null);
  const renameInputRef = useRef(null);

  // Ensure activeSheetId is valid
  useEffect(() => {
    if (sheets.length === 0) {
      const newSheet = makeSheetFromTemplate('blank', t('calc.newSheet'));
      setSheets([newSheet]);
      setActiveSheetId(newSheet.id);
    } else if (!sheets.find(s => s.id === activeSheetId)) {
      setActiveSheetId(sheets[0].id);
    }
  }, [sheets, activeSheetId, t]);

  // Persist on every change
  useEffect(() => {
    saveSheets(sheets);
  }, [sheets]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const updateActiveSheet = useCallback((updater) => {
    setSheets(prev => prev.map(s => s.id === activeSheetId
      ? { ...updater(s), updatedAt: Date.now() }
      : s
    ));
  }, [activeSheetId]);

  const handleCellClick = (row, col) => {
    if (!activeSheet) return;
    setEditValue(activeSheet.rows[row]?.[col] ?? '');
    setEditingCell({ row, col });
  };

  const commitEdit = () => {
    if (!editingCell) return;
    updateActiveSheet(s => {
      const rows = s.rows.map(r => [...r]);
      while (rows.length <= editingCell.row) rows.push(Array(s.headers.length).fill(''));
      rows[editingCell.row][editingCell.col] = editValue;
      return { ...s, rows };
    });
    setEditingCell(null);
  };

  const handleHeaderEdit = (col, value) => {
    updateActiveSheet(s => {
      const headers = [...s.headers];
      headers[col] = value;
      return { ...s, headers };
    });
  };

  const addRow = () => {
    updateActiveSheet(s => ({
      ...s,
      rows: [...s.rows, Array(s.headers.length).fill('')],
    }));
  };

  const addColumn = () => {
    updateActiveSheet(s => ({
      ...s,
      headers: [...s.headers, ''],
      rows: s.rows.map(r => [...r, '']),
    }));
  };

  const deleteRow = (row) => {
    updateActiveSheet(s => ({
      ...s,
      rows: s.rows.filter((_, i) => i !== row),
    }));
  };

  const deleteColumn = (col) => {
    updateActiveSheet(s => ({
      ...s,
      headers: s.headers.filter((_, i) => i !== col),
      rows: s.rows.map(r => r.filter((_, i) => i !== col)),
    }));
  };

  const createSheet = (templateKey) => {
    const name = t(TEMPLATES[templateKey].nameKey);
    const newSheet = makeSheetFromTemplate(templateKey, name);
    setSheets(prev => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
    setShowTemplates(false);
  };

  const duplicateSheet = (id) => {
    const sheet = sheets.find(s => s.id === id);
    if (!sheet) return;
    const copy = {
      ...sheet,
      id: `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${sheet.name} (copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSheets(prev => [...prev, copy]);
    setActiveSheetId(copy.id);
  };

  const deleteSheet = (id) => {
    if (!confirm(t('calc.confirmDelete'))) return;
    setSheets(prev => prev.filter(s => s.id !== id));
  };

  const startRename = (id) => {
    const sheet = sheets.find(s => s.id === id);
    if (!sheet) return;
    setRenamingId(id);
    setRenameValue(sheet.name);
  };

  const commitRename = () => {
    if (!renamingId) return;
    setSheets(prev => prev.map(s => s.id === renamingId ? { ...s, name: renameValue || s.name } : s));
    setRenamingId(null);
  };

  const exportCSV = () => {
    if (!activeSheet) return;
    const escape = v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      activeSheet.headers.map(escape).join(','),
      ...activeSheet.rows.map(row => row.map((cell, i) => {
        const computed = evaluateFormula(cell, activeSheet.rows, activeSheet.headers.length);
        return escape(computed);
      }).join(',')),
    ];
    const csv = lines.join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.name.replace(/[^a-z0-9_-]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeSheet) return null;

  const computedRows = useMemo(
    () => activeSheet.rows.map((row, rIdx) =>
      row.map((cell, cIdx) => {
        if (editingCell && editingCell.row === rIdx && editingCell.col === cIdx) return cell;
        return evaluateFormula(cell, activeSheet.rows, activeSheet.headers.length);
      })
    ),
    [activeSheet.rows, activeSheet.headers.length, editingCell]
  );

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t('calc.title')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('calc.subtitle')}</p>
      </div>

      {/* Sheet tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        borderBottom: '1px solid var(--border-color)',
        overflowX: 'auto',
        paddingBottom: 0,
      }}>
        {sheets.map(sheet => (
          <div
            key={sheet.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: '8px 8px 0 0',
              background: sheet.id === activeSheetId ? 'var(--bg-card)' : 'transparent',
              borderBottom: sheet.id === activeSheetId ? '2px solid var(--accent-blue)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
            onClick={() => setActiveSheetId(sheet.id)}
            onDoubleClick={() => startRename(sheet.id)}
          >
            {renamingId === sheet.id ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--accent-blue)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  width: 140,
                  outline: 'none',
                }}
              />
            ) : (
              <>
                <FileSpreadsheet size={13} style={{ color: 'var(--text-muted)' }} />
                <span>{sheet.name}</span>
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSheet(sheet.id); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: 4,
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <Plus size={14} />
          {t('calc.newSheet')}
        </button>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <button
              key={key}
              onClick={() => createSheet(key)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <FileText size={16} style={{ color: 'var(--accent-blue)' }} />
              {t(tpl.nameKey)}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <button onClick={addRow} className="calc-btn">
          <Plus size={13} />
          {t('calc.addRow')}
        </button>
        <button onClick={addColumn} className="calc-btn">
          <Plus size={13} />
          {t('calc.addColumn')}
        </button>
        <button onClick={() => duplicateSheet(activeSheetId)} className="calc-btn">
          <Copy size={13} />
          {t('calc.duplicateSheet')}
        </button>
        <button onClick={exportCSV} className="calc-btn calc-btn-primary">
          <Download size={13} />
          {t('calc.exportCSV')}
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          💡 {t('calc.formulaHelp')}
        </div>
      </div>

      {/* Spreadsheet */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        overflow: 'auto',
        maxHeight: 'calc(100vh - 340px)',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}>
          <thead>
            <tr>
              <th style={cornerStyle}></th>
              {activeSheet.headers.map((_, c) => (
                <th key={c} style={colHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span>{colIndexToLetter(c)}</span>
                    {activeSheet.headers.length > 1 && (
                      <button
                        onClick={() => deleteColumn(c)}
                        style={iconBtnStyle}
                        title="Eliminar columna"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              <th style={rowHeaderStyle}></th>
              {activeSheet.headers.map((h, c) => (
                <th key={c} style={{ ...cellStyle, background: 'var(--bg-input)', padding: 0 }}>
                  <input
                    type="text"
                    value={h}
                    onChange={e => handleHeaderEdit(c, e.target.value)}
                    placeholder="—"
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: 12,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSheet.rows.map((row, r) => (
              <tr key={r}>
                <td style={rowHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span>{r + 1}</span>
                    <button
                      onClick={() => deleteRow(r)}
                      style={iconBtnStyle}
                      title="Eliminar fila"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </td>
                {activeSheet.headers.map((_, c) => {
                  const isEditing = editingCell && editingCell.row === r && editingCell.col === c;
                  const rawValue = row[c] ?? '';
                  const isFormula = typeof rawValue === 'string' && rawValue.startsWith('=');
                  const displayValue = computedRows[r]?.[c] ?? '';
                  const isError = typeof displayValue === 'string' && displayValue.startsWith('#');
                  const isNum = !isNaN(parseFloat(displayValue)) && isFinite(displayValue);

                  return (
                    <td
                      key={c}
                      style={{
                        ...cellStyle,
                        background: isEditing ? 'var(--bg-input)' : 'transparent',
                        cursor: 'cell',
                        textAlign: isNum && !isEditing ? 'right' : 'left',
                        color: isError ? '#ef4444' : isFormula && !isEditing ? '#10b981' : 'var(--text-primary)',
                        fontFamily: isFormula && isEditing ? 'monospace' : 'inherit',
                        position: 'relative',
                      }}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              commitEdit();
                              // Move down
                              if (r + 1 < activeSheet.rows.length) {
                                setTimeout(() => handleCellClick(r + 1, c), 0);
                              }
                            }
                            if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              commitEdit();
                              if (c + 1 < activeSheet.headers.length) {
                                setTimeout(() => handleCellClick(r, c + 1), 0);
                              }
                            }
                          }}
                          style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            color: 'var(--text-primary)',
                            fontFamily: 'monospace',
                            fontSize: 13,
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <span style={{ display: 'inline-block', minHeight: '1em', minWidth: 30 }}>
                          {displayValue !== '' ? displayValue : ' '}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 12,
        fontSize: 11,
        color: 'var(--text-muted)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <span>📝 {activeSheet.rows.length} {lang === 'es' ? 'filas' : 'rows'} × {activeSheet.headers.length} {lang === 'es' ? 'columnas' : 'columns'}</span>
        <span>💾 {lang === 'es' ? 'Guardado automático en tu navegador' : 'Auto-saved in your browser'}</span>
      </div>
    </div>
  );
}

const cellStyle = {
  border: '1px solid var(--border-color)',
  padding: '8px 10px',
  minWidth: 90,
  height: 34,
  verticalAlign: 'middle',
};

const cornerStyle = {
  ...cellStyle,
  background: 'var(--bg-input)',
  width: 40,
  minWidth: 40,
};

const colHeaderStyle = {
  ...cellStyle,
  background: 'var(--bg-input)',
  color: 'var(--text-muted)',
  fontSize: 11,
  fontWeight: 600,
  padding: '4px 8px',
  textAlign: 'center',
};

const rowHeaderStyle = {
  ...cellStyle,
  background: 'var(--bg-input)',
  color: 'var(--text-muted)',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
  width: 40,
  minWidth: 40,
  padding: '4px 8px',
};

const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  opacity: 0.4,
};
