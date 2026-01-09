import { Table, TableWithOptimal } from '../types';

export class TableOptimizationService {
  /**
   * Find the best table for a given party size
   * Prioritizes:
   * 1. Exact match (capacity = party size)
   * 2. Smallest table that fits
   * 3. Minimize wasted capacity
   */
  findOptimalTable(tables: Table[], partySize: number): TableWithOptimal | null {
    if (tables.length === 0) return null;

    // Filter tables that can accommodate the party
    const suitableTables = tables.filter(t => t.capacity >= partySize);
    
    if (suitableTables.length === 0) return null;

    // Sort by capacity (ascending)
    suitableTables.sort((a, b) => a.capacity - b.capacity);

    // Best table is the smallest one that fits
    const optimalTable = suitableTables[0];
    
    return {
      ...optimalTable,
      isOptimal: optimalTable.capacity === partySize
    };
  }

  /**
   * Rank all available tables by suitability
   */
  rankTablesByOptimality(tables: Table[], partySize: number): TableWithOptimal[] {
    const suitableTables = tables.filter(t => t.capacity >= partySize);
    
    if (suitableTables.length === 0) return [];

    // Sort by wasted capacity (ascending)
    suitableTables.sort((a, b) => {
      const wasteA = a.capacity - partySize;
      const wasteB = b.capacity - partySize;
      return wasteA - wasteB;
    });

    return suitableTables.map((table, index) => ({
      ...table,
      isOptimal: index === 0 && table.capacity === partySize
    }));
  }

  /**
   * Suggest table combinations for large parties
   * (Future feature - not fully implemented)
   */
  suggestTableCombinations(_tables: Table[], _partySize: number): Table[][] {
    // This would implement logic to combine multiple tables
    // for parties larger than any single table capacity
    // For now, return empty array as this is a future feature
    return [];
  }

  /**
   * Calculate utilization metrics
   */
  calculateUtilization(table: Table, partySize: number): {
    utilization: number;
    wastedSeats: number;
  } {
    return {
      utilization: (partySize / table.capacity) * 100,
      wastedSeats: table.capacity - partySize
    };
  }
}

export default new TableOptimizationService();