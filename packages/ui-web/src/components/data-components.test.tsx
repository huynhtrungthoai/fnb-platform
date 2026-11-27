import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from '../test/render';
import { Checkbox } from './checkbox';
import { DataTable } from './data-table';
import { FilterBar } from './filter-bar';
import { LocalizedInput } from './localized-input';
import { Pagination } from './pagination';

import type { Column } from './data-table';
import type { LocalizedText } from '@fnb/contract';

interface Row {
  id: string;
  name: string;
}

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Tên', cell: (row) => row.name },
  { key: 'id', header: 'Mã', align: 'end', cell: (row) => row.id },
];

describe('DataTable', () => {
  it('renders rows under their headers', () => {
    renderWithI18n(
      <DataTable
        label="Bảng"
        columns={COLUMNS}
        rows={[{ id: '1', name: 'Lan' }]}
        rowKey={(row) => row.id}
      />,
    );
    const table = screen.getByRole('table', { name: 'Bảng' });
    expect(within(table).getByRole('columnheader', { name: 'Tên' })).toBeTruthy();
    expect(within(table).getByRole('cell', { name: 'Lan' })).toBeTruthy();
  });

  it('shows loading, empty and error states', async () => {
    const handleRetry = vi.fn();
    const { rerender } = renderWithI18n(
      <DataTable
        label="Bảng"
        columns={COLUMNS}
        rows={undefined}
        rowKey={(row) => row.id}
        loading
      />,
    );
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    rerender(<DataTable label="Bảng" columns={COLUMNS} rows={[]} rowKey={(row) => row.id} />);
    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    rerender(
      <DataTable
        label="Bảng"
        columns={COLUMNS}
        rows={[]}
        rowKey={(row) => row.id}
        error
        onRetry={handleRetry}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(handleRetry).toHaveBeenCalled();
  });
});

describe('Pagination', () => {
  it('summarises the range and moves between pages', async () => {
    const handleChange = vi.fn();
    renderWithI18n(<Pagination page={2} pageSize={20} total={95} onChange={handleChange} />);
    expect(screen.getByText('Hiển thị 21–40 trên 95')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('page');
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    expect(handleChange.mock.calls).toEqual([[3], [5]]);
  });

  it('hides the buttons when everything fits on one page', () => {
    renderWithI18n(<Pagination page={1} pageSize={20} total={3} onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('FilterBar', () => {
  it('searches and offers to clear only when filtered', async () => {
    const handleSearch = vi.fn();
    const handleClear = vi.fn();
    const { rerender } = renderWithI18n(
      <FilterBar
        search={{ label: 'Tìm', value: '', onChange: handleSearch }}
        isFiltered={false}
        onClear={handleClear}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Xoá bộ lọc' })).toBeNull();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm' }), 'a');
    expect(handleSearch).toHaveBeenCalledWith('a');
    rerender(
      <FilterBar
        search={{ label: 'Tìm', value: 'a', onChange: handleSearch }}
        isFiltered
        onClear={handleClear}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }));
    expect(handleClear).toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('toggles from its label and can be mixed', async () => {
    const handleChange = vi.fn();
    const { rerender } = renderWithI18n(
      <Checkbox checked={false} onChange={handleChange} label="Xem chi nhánh" />,
    );
    await userEvent.click(screen.getByText('Xem chi nhánh'));
    expect(handleChange).toHaveBeenCalledWith(true);
    rerender(<Checkbox checked="indeterminate" onChange={handleChange} label="Nền tảng" />);
    expect(screen.getByRole('checkbox', { name: 'Nền tảng' }).getAttribute('aria-checked')).toBe(
      'mixed',
    );
  });
});

describe('LocalizedInput', () => {
  function Sample() {
    const [value, setValue] = useState<LocalizedText>({ vi: 'Thu ngân' });
    return (
      <>
        <LocalizedInput label="Tên" value={value} onChange={setValue} />
        <output>{JSON.stringify(value)}</output>
      </>
    );
  }

  it('edits both languages and warns while English is missing', async () => {
    renderWithI18n(<Sample />);
    expect(screen.getByText('Chưa có tên tiếng Anh; sẽ hiện tên tiếng Việt.')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Tên (EN)'), 'Cashier');
    expect(screen.getByText('{"vi":"Thu ngân","en":"Cashier"}')).toBeTruthy();
    await userEvent.clear(screen.getByLabelText('Tên (EN)'));
    expect(screen.getByText('{"vi":"Thu ngân"}')).toBeTruthy();
  });
});
