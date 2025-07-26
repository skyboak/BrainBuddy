// src/utils/idGenerator.ts

/**
 * Generate a unique ID string
 * @returns A unique string ID
 */
export function generateUniqueId(): string {
    // Generate a random component
    const randomComponent = Math.random().toString(36).substring(2, 10);
    
    // Use timestamp for additional uniqueness
    const timestampComponent = Date.now().toString(36);
    
    // Combine for final ID
    return `${timestampComponent}-${randomComponent}`;
  }