import { describe, it, expect } from 'vitest';
import { generateAsciiTable, parseCSV, autoGenerateColumns } from '../src/tableUtils';

describe('Table Utils', () => {
	describe('parseCSV', () => {
		it('should parse simple CSV data', () => {
			const csv = 'Name,Age\nJohn,25\nJane,30';
			const result = parseCSV(csv);
			
			expect(result).toEqual([
				{ Name: 'John', Age: '25' },
				{ Name: 'Jane', Age: '30' }
			]);
		});

		it('should handle CSV with spaces', () => {
			const csv = 'Name, Age, City\nJohn, 25, New York\nJane, 30, San Francisco';
			const result = parseCSV(csv);
			
			expect(result).toEqual([
				{ Name: 'John', Age: '25', City: 'New York' },
				{ Name: 'Jane', Age: '30', City: 'San Francisco' }
			]);
		});

		it('should throw error for invalid CSV', () => {
			const csv = 'Name,Age\nJohn,25,Extra';
			expect(() => parseCSV(csv)).toThrow();
		});
	});

	describe('autoGenerateColumns', () => {
		it('should auto-detect numeric columns for right alignment', () => {
			const data = [
				{ Name: 'John', Age: '25', Score: '100' },
				{ Name: 'Jane', Age: '30', Score: '95' }
			];
			const columns = autoGenerateColumns(data);
			
			expect(columns[0]).toEqual({
				header: 'Name',
				width: 10,
				align: 'left'
			});
			expect(columns[1]).toEqual({
				header: 'Age',
				width: 10,
				align: 'right'
			});
			expect(columns[2]).toEqual({
				header: 'Score',
				width: 10,
				align: 'right'
			});
		});
	});

	describe('generateAsciiTable', () => {
		it('should generate a proper ASCII table', () => {
			const data = [
				{ Name: 'John', Age: '25' },
				{ Name: 'Jane', Age: '30' }
			];
			const columns = [
				{ header: 'Name', width: 4, align: 'left' as const },
				{ header: 'Age', width: 3, align: 'right' as const }
			];
			
			const result = generateAsciiTable(data, columns);
			
			expect(result).toContain('| Name | Age |');
			expect(result).toContain('| John |  25 |');
			expect(result).toContain('| Jane |  30 |');
			expect(result).toContain('+------+-----+');
		});

		it('should handle empty data', () => {
			const result = generateAsciiTable([], []);
			expect(result).toBe('No data to display');
		});

		it('should auto-adjust column widths', () => {
			const data = [
				{ Name: 'VeryLongName', Age: '25' }
			];
			const columns = [
				{ header: 'Name', width: 4, align: 'left' as const },
				{ header: 'Age', width: 3, align: 'right' as const }
			];
			
			const result = generateAsciiTable(data, columns);
			
			// Should expand to fit the longer name
			expect(result).toContain('VeryLongName');
			expect(result).toContain('+--------------+-----+');
		});
	});
});
