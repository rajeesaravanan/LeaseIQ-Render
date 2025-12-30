const fs = require('fs');
const path = require('path');

// Lazy load pdfjsLib using dynamic import
let pdfjsLibPromise = null;

async function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(module => module.default || module);
  }
  return pdfjsLibPromise;
}

/**
 * Represents a chunk of PDF content with associated metadata.
 */
class PDFChunk {
    constructor(pageNumber, chunkId, overlapInfo, originalPageText, previousOverlap = null, nextOverlap = null) {
        this.page_number = pageNumber;
        this.chunk_id = chunkId;
        this.overlap_info = overlapInfo;
        this.original_page_text = originalPageText;
        this.previous_overlap = previousOverlap;
        this.next_overlap = nextOverlap;
    }
}

/**
 * Main class for parsing and chunking PDF files using pdf.js
 */
class PDFChunker {
    /**
     * Initialize the PDF chunker.
     * 
     * @param {number} overlapPercentage - Percentage of overlap between chunks (default: 0.2 for 20%)
     */
    constructor(overlapPercentage = 0.2) {
        this.overlap_percentage = overlapPercentage;
    }

    /**
     * Parse a PDF file and extract text with page references.
     * 
     * @param {string|Buffer|Uint8Array} pdfSource - Can be:
     *   - string: Path to the PDF file
     *   - Buffer: PDF file content as Buffer
     *   - Uint8Array: PDF file content as Uint8Array
     * @param {boolean} extractTables - Whether to extract tables with proper formatting
     * @returns {Promise<Array<[number, string]>>} List of tuples containing (page_number, text)
     * @throws {Error} If there's an error parsing the PDF
     */
    async parse_pdf(pdfSource, extractTables = true) {
        try {
            let data;
            
            // Handle different input types
            if (typeof pdfSource === 'string') {
                // File path
                if (!fs.existsSync(pdfSource)) {
                    throw new Error(`PDF file not found: ${pdfSource}`);
                }
                data = new Uint8Array(fs.readFileSync(pdfSource));
            } else if (Buffer.isBuffer(pdfSource)) {
                // Buffer data
                data = new Uint8Array(pdfSource);
            } else if (pdfSource instanceof Uint8Array) {
                // Uint8Array data
                data = pdfSource;
            } else {
                throw new Error(`Unsupported PDF source type: ${typeof pdfSource}`);
            }

            // Load the PDF document
            const pdfjsLib = await getPdfjsLib();
            const loadingTask = pdfjsLib.getDocument({ data });
            const pdfDocument = await loadingTask.promise;

            const pagesData = [];
            const totalPages = pdfDocument.numPages;

            if (extractTables) {
                // First pass: analyze all tables across pages to handle multi-page tables
                const tableTracker = await this._analyzeMultiPageTables(pdfDocument);

                // Second pass: extract text with table awareness
                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    const page = await pdfDocument.getPage(pageNum);
                    const text = await this._extractTextWithTablesAndTracking(page, pageNum, tableTracker);
                    pagesData.push([pageNum, text]);
                }
            } else {
                // Basic text extraction
                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    const page = await pdfDocument.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const text = this._extractTextFromContent(textContent);
                    pagesData.push([pageNum, text]);
                }
            }

            return pagesData;
        } catch (error) {
            throw new Error(`Error parsing PDF: ${error.message}`);
        }
    }

    /**
     * Analyze tables across all pages to identify multi-page tables.
     * 
     * @param {Object} pdfDocument - pdf.js document object
     * @returns {Promise<Object>} Table tracking information
     */
    async _analyzeMultiPageTables(pdfDocument) {
        const tableTracker = {
            multi_page_tables: {},  // Track tables that span multiple pages
            table_origins: {},      // Track which page each table originates from
            processed_tables: new Set() // Track which tables have been processed
        };

        try {
            const totalPages = pdfDocument.numPages;
            
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Extract text items and analyze for table-like structures
                const tables = this._detectTables(textContent, pageNum);
                
                for (let i = 0; i < tables.length; i++) {
                    const tableId = `page_${pageNum}_table_${i + 1}`;
                    const table = tables[i];
                    
                    // Check if table extends beyond page boundaries
                    const viewport = page.getViewport({ scale: 1.0 });
                    if (table.bbox && table.bbox[3] > viewport.height * 0.9) {
                        // This might be a multi-page table
                        tableTracker.multi_page_tables[tableId] = {
                            origin_page: pageNum,
                            bbox: table.bbox,
                            table_data: table.data
                        };
                    }
                    
                    tableTracker.table_origins[tableId] = pageNum;
                }
            }
        } catch (error) {
            console.warn(`Warning: Error analyzing multi-page tables: ${error.message}`);
        }

        return tableTracker;
    }

    /**
     * Detect tables in text content by analyzing structure.
     * 
     * @param {Object} textContent - pdf.js text content object
     * @param {number} pageNum - Page number
     * @returns {Array<Object>} Array of detected tables
     */
    _detectTables(textContent, pageNum) {
        const tables = [];
        const items = textContent.items || [];
        
        if (items.length === 0) {
            return tables;
        }

        // Group items by y-coordinate to identify rows
        const rows = {};
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        items.forEach(item => {
            const y = Math.round(item.transform[5]); // y-coordinate
            if (!rows[y]) {
                rows[y] = [];
            }
            rows[y].push(item);
            
            const x = item.transform[4]; // x-coordinate
            const itemHeight = item.height || 0;
            const itemWidth = item.width || 0;
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + itemWidth);
            minY = Math.min(minY, y - itemHeight);
            maxY = Math.max(maxY, y);
        });

        // Identify table-like structures (rows with similar y-coordinates and multiple columns)
        const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
        const potentialTableRows = [];
        let currentTableRows = [];

        for (let i = 0; i < sortedY.length; i++) {
            const y = sortedY[i];
            const rowItems = rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
            
            // Check if this row has multiple items (potential table row)
            if (rowItems.length >= 2) {
                if (currentTableRows.length === 0 || 
                    Math.abs(y - currentTableRows[currentTableRows.length - 1].y) < 20) {
                    currentTableRows.push({ y, items: rowItems });
                } else {
                    if (currentTableRows.length >= 2) {
                        potentialTableRows.push([...currentTableRows]);
                    }
                    currentTableRows = [{ y, items: rowItems }];
                }
            } else {
                if (currentTableRows.length >= 2) {
                    potentialTableRows.push([...currentTableRows]);
                }
                currentTableRows = [];
            }
        }

        if (currentTableRows.length >= 2) {
            potentialTableRows.push(currentTableRows);
        }

        // Convert potential table rows to table data
        potentialTableRows.forEach((tableRows, tableIndex) => {
            if (tableRows.length >= 2) {
                const tableData = tableRows.map(row => 
                    row.items.map(item => item.str.trim()).filter(str => str.length > 0)
                );
                
                if (tableData.length > 0 && tableData[0].length > 0) {
                    tables.push({
                        data: tableData,
                        bbox: [minX, minY, maxX, maxY],
                        page: pageNum
                    });
                }
            }
        });

        return tables;
    }

    /**
     * Extract text from a page with table awareness and multi-page table tracking.
     * 
     * @param {Object} page - pdf.js page object
     * @param {number} pageNum - Page number
     * @param {Object} tableTracker - Table tracking information
     * @returns {Promise<string>} Formatted text with tables properly structured
     */
    async _extractTextWithTablesAndTracking(page, pageNum, tableTracker) {
        try {
            // Get basic text first
            const textContent = await page.getTextContent();
            const basicText = this._extractTextFromContent(textContent);

            // Find tables on the page
            const tables = this._detectTables(textContent, pageNum);

            if (tables.length === 0) {
                return basicText;
            }

            // Process tables with multi-page awareness
            let resultText = basicText;

            for (let i = 0; i < tables.length; i++) {
                const tableId = `page_${pageNum}_table_${i + 1}`;

                // Check if this table should be processed on this page
                if (tableTracker.processed_tables.has(tableId)) {
                    continue; // Skip if already processed
                }

                // Check if this is a multi-page table
                if (tableTracker.multi_page_tables[tableId]) {
                    // This is a multi-page table - only show on origin page
                    if (tableTracker.multi_page_tables[tableId].origin_page === pageNum) {
                        // This is the origin page - show the full table
                        const tableData = tables[i].data;
                        if (tableData && tableData.length > 0) {
                            const formattedTable = this._formatTableAsLLMFriendlyText(tableData, i + 1);
                            resultText += `\n\n${formattedTable}\n`;
                            tableTracker.processed_tables.add(tableId);
                        }
                    } else {
                        // This is a continuation page - skip the table
                        tableTracker.processed_tables.add(tableId);
                        continue;
                    }
                } else {
                    // Regular single-page table
                    const tableData = tables[i].data;
                    if (tableData && tableData.length > 0) {
                        const formattedTable = this._formatTableAsLLMFriendlyText(tableData, i + 1);
                        resultText += `\n\n${formattedTable}\n`;
                        tableTracker.processed_tables.add(tableId);
                    }
                }
            }

            return resultText;
        } catch (error) {
            console.warn(`Warning: Table extraction failed, using basic text: ${error.message}`);
            const textContent = await page.getTextContent();
            return this._extractTextFromContent(textContent);
        }
    }

    /**
     * Extract plain text from pdf.js text content.
     * 
     * @param {Object} textContent - pdf.js text content object
     * @returns {string} Plain text
     */
    _extractTextFromContent(textContent) {
        const items = textContent.items || [];
        let text = '';
        let lastY = null;

        items.forEach(item => {
            const currentY = Math.round(item.transform[5]);
            
            // Add newline if y-coordinate changed significantly (new line)
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                text += '\n';
            }
            
            text += item.str;
            lastY = currentY;
        });

        return text.trim();
    }

    /**
     * Format table data as LLM-friendly structured text.
     * 
     * @param {Array<Array<string>>} tableData - Table data as list of rows
     * @param {number} tableNum - Table number for reference
     * @returns {string} LLM-friendly formatted table text
     */
    _formatTableAsLLMFriendlyText(tableData, tableNum) {
        if (!tableData || tableData.length === 0) {
            return `TABLE ${tableNum}: [Empty table]`;
        }

        try {
            const formattedLines = [];
            formattedLines.push(`TABLE ${tableNum}:`);
            formattedLines.push('='.repeat(50));

            // Process header row
            if (tableData.length > 0) {
                const headerRow = tableData[0];
                formattedLines.push('HEADER:');
                formattedLines.push(headerRow.map(cell => (cell || '').trim() || '[Empty]').join(' | '));
                formattedLines.push('-'.repeat(60));
            }

            // Process data rows
            if (tableData.length > 1) {
                formattedLines.push('DATA:');
                tableData.slice(1).forEach((row, rowIdx) => {
                    formattedLines.push(`Row ${rowIdx + 1}: ` + row.map(cell => (cell || '').trim() || '[Empty]').join(' | '));
                });
            }

            formattedLines.push('='.repeat(50));
            formattedLines.push(`END TABLE ${tableNum}`);

            return formattedLines.join('\n');
        } catch (error) {
            return `TABLE ${tableNum}: [Error formatting: ${error.message}]`;
        }
    }

    /**
     * Calculate the number of characters to use for overlap.
     * 
     * @param {string} text - The text to calculate overlap for
     * @returns {number} Number of characters for overlap
     */
    calculateOverlapChars(text) {
        return Math.floor(text.length * this.overlap_percentage);
    }

    /**
     * Create chunks from pages data with overlap between adjacent pages.
     * 
     * @param {Array<[number, string]>} pagesData - List of [page_number, text] tuples
     * @returns {Array<PDFChunk>} List of PDF chunks with overlap information
     */
    createChunks(pagesData) {
        if (!pagesData || pagesData.length === 0) {
            return [];
        }

        const chunks = [];
        const totalPages = pagesData.length;

        pagesData.forEach(([pageNum, text], i) => {
            const overlapInfo = {
                has_previous_overlap: false,
                has_next_overlap: false,
                previous_page: null,
                next_page: null,
                overlap_chars_used: 0
            };

            // Initialize overlap text fields
            let prevOverlapText = null;
            let nextOverlapText = null;

            // Add overlap from previous page (if not first page)
            if (i > 0) {
                const [prevPageNum, prevText] = pagesData[i - 1];
                const overlapChars = this.calculateOverlapChars(prevText);
                if (overlapChars > 0) {
                    prevOverlapText = prevText.length > overlapChars 
                        ? prevText.slice(-overlapChars) 
                        : prevText;
                    overlapInfo.has_previous_overlap = true;
                    overlapInfo.previous_page = prevPageNum;
                    overlapInfo.overlap_chars_used += overlapChars;
                }
            }

            // Add overlap from next page (if not last page)
            if (i < totalPages - 1) {
                const [nextPageNum, nextText] = pagesData[i + 1];
                const overlapChars = this.calculateOverlapChars(nextText);
                if (overlapChars > 0) {
                    nextOverlapText = nextText.length > overlapChars 
                        ? nextText.slice(0, overlapChars) 
                        : nextText;
                    overlapInfo.has_next_overlap = true;
                    overlapInfo.next_page = nextPageNum;
                    overlapInfo.overlap_chars_used += overlapChars;
                }
            }

            const chunk = new PDFChunk(
                pageNum,
                i + 1,
                overlapInfo,
                text,
                prevOverlapText,
                nextOverlapText
            );

            chunks.push(chunk);
        });

        return chunks;
    }

    /**
     * Main method to process a PDF file and return chunks.
     * 
     * @param {string|Buffer|Uint8Array} pdfSource - Can be:
     *   - string: Path to the PDF file
     *   - Buffer: PDF file content as Buffer
     *   - Uint8Array: PDF file content as Uint8Array
     * @param {boolean} extractTables - Whether to extract tables with proper formatting
     * @returns {Promise<Array<PDFChunk>>} List of PDF chunks with overlap
     */
    async process_pdf(pdfSource, extractTables = true) {
        const sourceType = typeof pdfSource === 'string' ? 'file path' : 'buffer/data';
        console.log(`Processing PDF from ${sourceType}`);
        console.log(`Table extraction: ${extractTables ? 'Enabled' : 'Disabled'}`);

        // Parse the PDF
        const pagesData = await this.parse_pdf(pdfSource, extractTables);
        console.log(`Extracted text from ${pagesData.length} pages`);

        // Create chunks with overlap
        const chunks = this.createChunks(pagesData);
        console.log(`Created ${chunks.length} chunks with ${this.overlap_percentage * 100}% overlap`);

        return chunks;
    }

    /**
     * Get information about tables found in the PDF.
     * 
     * @param {string|Buffer|Uint8Array} pdfSource - Can be:
     *   - string: Path to the PDF file
     *   - Buffer: PDF file content as Buffer
     *   - Uint8Array: PDF file content as Uint8Array
     * @returns {Promise<Object<number, number>>} Dictionary mapping page numbers to number of tables found
     */
    async getTableInfo(pdfSource) {
        try {
            let data;

            // Handle different input types
            if (typeof pdfSource === 'string') {
                if (!fs.existsSync(pdfSource)) {
                    throw new Error(`PDF file not found: ${pdfSource}`);
                }
                data = new Uint8Array(fs.readFileSync(pdfSource));
            } else if (Buffer.isBuffer(pdfSource)) {
                data = new Uint8Array(pdfSource);
            } else if (pdfSource instanceof Uint8Array) {
                data = pdfSource;
            } else {
                throw new Error(`Unsupported PDF source type: ${typeof pdfSource}`);
            }

            const pdfjsLib = await getPdfjsLib();
            const loadingTask = pdfjsLib.getDocument({ data });
            const pdfDocument = await loadingTask.promise;
            const totalPages = pdfDocument.numPages;

            const tableInfo = {};

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();
                const tables = this._detectTables(textContent, pageNum);
                tableInfo[pageNum] = tables.length;
            }

            return tableInfo;
        } catch (error) {
            throw new Error(`Error analyzing tables in PDF: ${error.message}`);
        }
    }

    /**
     * Print a summary of the created chunks.
     * 
     * @param {Array<PDFChunk>} chunks - List of PDF chunks
     */
    printChunkSummary(chunks) {
        console.log('\n' + '='.repeat(60));
        console.log('CHUNK SUMMARY');
        console.log('='.repeat(60));

        chunks.forEach(chunk => {
            const tableCount = (chunk.original_page_text.match(/TABLE \d+:/g) || []).length;

            console.log(`\nChunk ${chunk.chunk_id} (Page ${chunk.page_number}):`);
            console.log(`  Text length: ${chunk.original_page_text.length} characters`);
            console.log(`  Tables found: ${tableCount}`);
            console.log(`  Overlap info:`, JSON.stringify(chunk.overlap_info, null, 2));

            const preview = chunk.original_page_text.length > 200 
                ? chunk.original_page_text.slice(0, 200) + '...' 
                : chunk.original_page_text;
            console.log(`  Text preview: ${preview}`);
            console.log('-'.repeat(40));
        });
    }
}

module.exports = {
    PDFChunker,
    PDFChunk
};

