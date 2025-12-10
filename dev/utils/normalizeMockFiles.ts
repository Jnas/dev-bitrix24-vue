// utils/normalizeMockFiles.ts
import fs from 'fs';
import path from 'path';

/**
 * Script for normalizing existing mock files
 * Converts empty arrays [] to empty objects {} in parameters
 */
function normalizeMockFiles() {
    const mockDir = path.join(process.cwd(), 'src', 'mock');

    if (!fs.existsSync(mockDir)) {
        console.log('Mock data folder not found');
        return;
    }

    const files = fs.readdirSync(mockDir);

    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filePath = path.join(mockDir, file);
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                // Normalize parameters if it's an array and empty
                if (content.params && Array.isArray(content.params) && content.params.length === 0) {
                    content.params = {};
                    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
                }
            } catch (error) {
                console.error(`Error processing file ${file}:`, error);
            }
        }
    });

}
// Run if file is executed directly
if (require.main === module) {
    normalizeMockFiles();
}

export { normalizeMockFiles };