// Utility functions for ASCII table generation

export interface TableColumn {
	header: string;
	width: number;
	align?: 'left' | 'right' | 'center';
}

export interface TableData {
	[key: string]: string | number;
}

export function generateAsciiTable(data: TableData[], columns: TableColumn[]): string {
	if (data.length === 0) {
		return 'No data to display';
	}

	// Ensure columns have proper widths
	const processedColumns = columns.map(col => ({
		...col,
		width: Math.max(col.width, col.header.length)
	}));

	// Auto-adjust column widths based on data
	data.forEach(row => {
		processedColumns.forEach(col => {
			const value = String(row[col.header] || '');
			col.width = Math.max(col.width, value.length);
		});
	});

	// Generate table parts
	const separator = '+' + processedColumns.map(col => '-'.repeat(col.width + 2)).join('+') + '+';
	const header = '|' + processedColumns.map(col => ` ${col.header.padEnd(col.width)} `).join('|') + '|';
	
	const rows = data.map(row => 
		'|' + processedColumns.map(col => {
			const value = String(row[col.header] || '');
			const align = col.align || 'left';
			let paddedValue: string;
			
			switch (align) {
				case 'right':
					paddedValue = value.padStart(col.width);
					break;
				case 'center':
					const totalPadding = col.width - value.length;
					const leftPadding = Math.floor(totalPadding / 2);
					const rightPadding = totalPadding - leftPadding;
					paddedValue = ' '.repeat(leftPadding) + value + ' '.repeat(rightPadding);
					break;
				default: // left
					paddedValue = value.padEnd(col.width);
			}
			
			return ` ${paddedValue} `;
		}).join('|') + '|'
	);

	return [separator, header, separator, ...rows, separator].join('\n');
}

export function parseCSV(csvText: string): TableData[] {
	const lines = csvText.trim().split('\n');
	if (lines.length < 2) {
		throw new Error('CSV must have at least a header row and one data row');
	}

	// Parse header
	const headers = lines[0].split(',').map(h => h.trim());
	
	// Parse data rows
	const data: TableData[] = [];
	for (let i = 1; i < lines.length; i++) {
		const values = lines[i].split(',').map(v => v.trim());
		if (values.length !== headers.length) {
			throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
		}
		
		const row: TableData = {};
		headers.forEach((header, index) => {
			row[header] = values[index];
		});
		data.push(row);
	}
	
	return data;
}

export function autoGenerateColumns(data: TableData[]): TableColumn[] {
	if (data.length === 0) {
		return [];
	}

	const headers = Object.keys(data[0]);
	return headers.map(header => {
		// Determine if column should be right-aligned (for numbers)
		const isNumeric = data.every(row => {
			const value = row[header];
			return value === '' || !isNaN(Number(value));
		});

		return {
			header,
			width: Math.max(header.length, 10), // Minimum width
			align: isNumeric ? 'right' : 'left'
		};
	});
}
