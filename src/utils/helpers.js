const fs = require("fs");
const path = require("path");
const { getLLMAdapter } = require("../adapters/llms");
const { PDFChunker } = require("./parsers/pdf");
const { loadChunks, saveChunks } = require("./cache");
const { ANALYSIS_CONFIG, AnalysisType } = require("./constants");
const audit = require("./references/audit");

// Initialize LLM adapter (singleton pattern)
let llmAdapterInstance = null;

/**
 * Get LLM adapter instance (singleton)
 * @returns {BaseLLMAdapter} LLM adapter instance
 */
function getLLMAdapterInstance() {
  if (!llmAdapterInstance) {
    const { getLLMAdapter: createLLMAdapter } = require("../adapters/llms");
    llmAdapterInstance = createLLMAdapter();
  }
  return llmAdapterInstance;
}

/**
 * Build chunk data string from PDF chunks
 * @param {Array} chunks - Array of PDFChunk objects
 * @returns {string} Formatted string with chunk data
 */
function buildChunkData(chunks) {
  let data = "Given below is the data of a Lease PDF\n";
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    data += `
        
            Details about Page number ${i}
            "chunk_id": ${chunk.chunk_id},
            "page_number": ${chunk.page_number},
            "text": ${chunk.original_page_text},
            "previous_overlap": ${chunk.previous_overlap || null},
            "next_overlap": ${chunk.next_overlap || null},
            "overlap_info": ${JSON.stringify(chunk.overlap_info || {})}
        
        `;
  }
  return data;
}

/**
 * Parse LLM response with fallback handling
 * @param {string} content - LLM response content
 * @returns {Object} Parsed JSON object
 */
function parseLLMResponse(content) {
  try {
    return JSON.parse(content);
  } catch (jsonError) {
    try {
      // Try to handle single-quoted Python-style dicts
      // Replace single quotes with double quotes for JSON parsing
      const cleaned = content
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
        .replace(/:\s*"([^"]*)"/g, ': "$1"');
      return JSON.parse(cleaned);
    } catch (evalError) {
      // Fallback - wrap raw content
      return { content: content };
    }
  }
}

/**
 * Load cached PDF chunks or process new PDF
 * @param {string} filename - Original filename
 * @param {Buffer} fileContent - PDF file content as Buffer
 * @returns {Promise<Array>} Array of PDFChunk objects
 */
async function loadOrProcessPDF(filename, fileContent) {
  const cachedChunks = loadChunks(filename);
  
  if (cachedChunks) {
    console.log(`Found cached PDF analysis for ${filename}`);
    return cachedChunks;
  }

  console.log(`Processing new PDF: ${filename}`);
  const chunker = new PDFChunker(0.2); // 20% overlap
  const chunks = await chunker.process_pdf(fileContent, true); // extract_tables = true

  // Cache the chunks
  saveChunks(filename, chunks);

  return chunks;
}

/**
 * Mock Google Docs API - returns placeholder content
 * @param {Array<number>} infoList - List of document indices to retrieve
 * @returns {Promise<Array<string>>} Array of document content strings
 */
async function contentFromDoc(infoList) {
  // Mock implementation - returns placeholder content with proper template placeholders
  // In production, this would call Google Docs API
  const mockContent = [
    `
    field_description = """
        ## leaseInformation
        The main container object that holds all the extracted details related to a specific lease agreement.

        ### lease
        This object contains details about the lease agreement's identifier.
        * **value**: The name, title, or unique identifier of the lease document (e.g., "Commercial Lease Agreement").
        * **citation**: The page number and line number in the PDF where the lease's name or title is found (e.g., PDF name, Page number, Line number).
        * **amendments**: A list of any changes or modifications made specifically to the lease identifier over time.

        ### property
        This object describes the physical property being leased.
        * **value**: The address of the property in standard American format (e.g., "123 Maple Street, Anytown, USA").
        * **citation**: The page number and line number in the PDF where the property's address or description is located (e.g., PDF name, Page number, Line number).
        * **amendments**: A list containing details of any changes to the property description, such as adding or removing space.

        ### leaseFrom (Lessor)
        This object identifies the party granting the lease (the landlord or owner).
        * **value**: The full legal name of the lessor (e.g., "City Properties LLC").
        * **citation**: The page number and line number in the PDF where the lessor is identified (e.g., PDF name, Page number, Line number).
        * **amendments**: A list of any recorded changes to the lessor's identity, such as a change in ownership.

        ### leaseTo (Lessee)
        This object identifies the party receiving the lease (the tenant).
        * **value**: The full legal name of the lessee (e.g., "Global Tech Inc.").
        * **citation**: The page number and line number in the PDF where the lessee is identified (e.g., PDF name, Page number, Line number).
        * **amendments**: A list of any changes to the lessee's identity, such as a company name change.

        """

    `, 
    `## space
The main container object that holds all specific details about the physical space being leased.

### unit
This object identifies the specific suite or unit number within the building.
* **value**: The identifier for the unit (e.g., "Suite 450", "Unit 3B").
* **citation**: The page number in the PDF where this unit is mentioned.
* **amendments**: A list of any changes to the unit's designation.

### building
This object contains the name or identifier of the building where the unit is located.
* **value**: The official name or number of the building (e.g., "The Apex Tower", "Building C").
* **citation**: The page number where the building is identified.
* **amendments**: A list of any changes to the building's name or identifier.

### floor
This object specifies the floor on which the leased space is located.
* **value**: The floor level (e.g., "12th Floor", "Mezzanine").
* **citation**: The page number where the floor is mentioned.
* **amendments**: A list of any updates related to the floor designation.

### areaRentable
This object describes the rentable area, which typically includes the usable area plus a portion of the building's common spaces.
* **value**: The total rentable square footage or meters (e.g., "10,000 sq ft").
* **citation**: The page number specifying the rentable area.
* **amendments**: A list of any recalculations or changes to the rentable area.

### areaUsable
This object describes the usable area, which is the actual space exclusively occupied by the tenant.
* **value**: The total usable square footage or meters (e.g., "9,200 sq ft").
* **citation**: The page number specifying the usable area.
* **amendments**: A list of any recalculations or changes to the usable area.

### status
This object indicates the current status of the space.
* **value**: The current availability or condition (e.g., "Occupied", "Available for Lease", "Under Renovation").
* **citation**: The page number where the status is mentioned.
* **amendments**: A list of any changes to the space's status over time.

### notes
This object is for any additional, miscellaneous information about the space.
* **value**: Any relevant notes or comments (e.g., "Space includes a private balcony", "As-is condition").
* **citation**: The page number where these notes are found.
* **amendments**: A list of any updates or additions to the notes.
    `,
    `
    ## chargeSchedules
    The main container object that holds all information about payment schedules, including recurring charges like base rent and conditional charges like late fees.

    ### baseRent
    An **array of objects**, where each object represents a specific period in the rent schedule. This structure allows for rent escalations over the lease term.

    #### Fields within each \`baseRent\` object:
    * **chargeCode**: An internal code used to classify this type of charge.
    * **description**: A plain-text description of the rent period.
    * **dateFrom**: The start date for this specific rent amount.
    * **dateTo**: The end date for this specific rent amount.
    * **monthlyAmount**: The total rent due each month during this period.
    * **annualAmount**: The total rent for a full year during this period.
    * **areaRentable**: The rentable area used for this calculation.
    * **amountPerArea**: The rent calculated on a per-unit-area basis (e.g., per square foot).
    * **managementFees**: Any management fees included in or associated with the base rent.
    * **amendments**: A list of any modifications that apply to this specific rent period.

    ### lateFee
    This object defines the rules and penalties for overdue payments.
    * **calculationType**: The method used to determine the initial late fee (e.g., "Fixed Amount", "Percentage of Overdue Amount").
    * **graceDays**: The number of days after the due date before a late fee is charged.
    * **percent**: The percentage applied if \`calculationType\` is based on a percentage.
    * **secondFeeCalculationType**: The method for calculating a subsequent or secondary late fee.
    * **secondFeeGrace**: The number of additional days before the second late fee is applied.
    * **secondFeePercent**: The percentage for the second late fee, if applicable.
    * **perDayFee**: A fixed amount charged for each day the payment remains overdue.


    `,
    `
        ## otherLeaseProvisions
        The main container object for various clauses, conditions, and special provisions detailed in the lease agreement. This section covers topics beyond the primary financial and space definitions.

        ---

        ### Common Field Definitions
        Many sections below share a common structure. Here's what those fields represent:
        * **synopsis**: A concise summary of the key points of the lease clause.
        * **keyParameters**: Specific data points extracted from the clause, such as dates, amounts, percentages, or other critical terms.
        * **narrative**: The full, verbatim text of the clause as it appears in the lease document.
        * **definition**: The specific legal definition of a term as provided by the lease (e.g., what qualifies as a "Tax" or "Operating Expense").
        * **citation**: The page number in the source document where the information is located.
        * **amendments**: A list of any modifications or changes that apply to that specific piece of information.

        ---

        ### premisesAndTerm
        Defines the leased property and the duration of the lease agreement.
        * **synopsis**, **keyParameters**, **narrative**

        ### taxes
        Details the tenant's and landlord's responsibilities regarding property taxes.
        * **synopsis**, **definition**, **keyParameters**, **narrative**

        ### operatingExpenses
        Details responsibilities for common area maintenance (CAM) and other shared building costs.
        * **synopsis**, **definition**, **keyParameters**, **narrative**
        * **billingTimeline**: The schedule and process for billing and reconciling operating expenses.
        * **formulas**: The specific calculation used to determine the tenant's share of expenses.
        * **capitalRules**: Rules defining if and how capital improvements can be included in operating expenses passed through to the tenant.

        ### repairsAndMaintenance
        Outlines who is responsible for repairing and maintaining different parts of the premises and building.
        * **synopsis**, **narrative**

        ### alterations
        Specifies the tenant's rights and restrictions for making physical changes or improvements to the leased space.
        * **synopsis**

        ### signs
        Governs the tenant's rights to place signage on the property, including rules on size, location, and appearance.
        * **synopsis**

        ### services
        Lists the services the landlord is obligated to provide, such as HVAC, electricity, water, and janitorial services.
        * **synopsis**

        ### insurance
        Details the insurance coverage types and limits required for both the tenant and the landlord.
        * **synopsis**, **keyParameters**

        ### casualty
        Describes the procedures, rights, and obligations of both parties if the property is damaged or destroyed by events like a fire or natural disaster.
        * **synopsis**

        ### liabilityAndIndemnification
        Defines who is legally and financially responsible for injuries, damages, or lawsuits arising from incidents on the property.
        * **synopsis**

        ### use
        Specifies the permitted and prohibited uses of the leased premises by the tenant.
        * **synopsis**

        ### landlordsRightOfEntry
        Outlines the conditions under which the landlord can enter the tenant's space (e.g., for inspections, repairs, or showing the property).
        * **synopsis**

        ### assignmentAndSubletting
        Defines the tenant's ability to transfer the lease to another party (assignment) or lease a portion of their space to another entity (subletting).
        * **synopsis**

        ### parking
        Details the tenant's parking rights, including the number of spaces, location, and any associated costs.
        * **synopsis**

        ### condemnation
        Specifies the rights of the tenant and landlord if the property is acquired by a government entity through eminent domain.
        * **synopsis**

        ### holdover
        Describes the terms and financial penalties if the tenant remains in the space after the lease term has expired.
        * **synopsis**

        ### quietEnjoyment
        A covenant that grants the tenant the right to use the property without interference from the landlord.
        * **synopsis**

        ### defaultAndRemedies
        Outlines what constitutes a breach of the lease by either party and the actions the non-breaching party can take in response.
        * **synopsis**

        ### subordination
        Addresses the priority of the lease relative to the landlord's mortgage lender, often including non-disturbance and attornment provisions (SNDA).
        * **synopsis**

        ### liens
        Prohibits the tenant from allowing legal claims (liens) to be placed on the property, typically by contractors or suppliers.
        * **synopsis**

        ### hazardousMaterials
        Governs the use, storage, and disposal of hazardous materials on the premises.
        * **synopsis**

        ### rulesAndRegulations
        Refers to the general building rules and regulations that the tenant must adhere to.
        * **synopsis**

        ### brokerage
        Identifies the real estate brokers involved in the lease transaction and outlines commission agreements.
        * **synopsis**

        ### estoppel
        Describes the tenant's obligation to sign an estoppel certificate, a document that confirms the current terms of the lease for a third party, like a new owner or lender.
        * **synopsis**

        ### notices
        Specifies the official methods and addresses for sending legal notices between the tenant and landlord.
        * **synopsis**

        ### rightOfFirstRefusalOffer
        Details any right the tenant may have to match an offer to buy the property or lease additional space before it is offered to others.
        * **synopsis**

        ### expansionAndRelocation
        Outlines any rights the tenant has to expand into additional space or any obligation to relocate to a different space within the property at the landlord's request.
        * **synopsis**

        ### landlordDefault
        Specifies the tenant's remedies if the landlord fails to meet their obligations under the lease.
        * **synopsis**

    `,
    `
    Lease Executive Summary Generation Guidelines

    Read the entire lease word by word and generate a concise Executive Summary (130–150 words) describing the lease in clear, factual language suitable for a professional lease abstraction.

    1. Narrative Summary (1–2 paragraphs)
    Provide a cohesive overview that highlights:

    Tenant and Landlord names
    Premises location, floor, rentable and usable square footage
    Lease term (start and end dates) and renewal options
    Base rent and escalation schedule
    Tenant improvement allowance, parking, or other financial incentives
    Delivery condition (e.g., Core & Shell, As-Is) and permitted use
    Responsibilities of each party (maintenance, utilities, insurance, janitorial, repairs)
    Any notable provisions such as holdover rent, indemnities, signage rights, environmental restrictions, or unique rules and regulations

    The summary should capture and synthesize all major terms — business, financial, operational, legal, compliance, risk, performance, and any other obligation or impact that defines the relationship between the parties or affects cost, rights, or exposure.
    Avoid quoting or restating clauses; use concise, factual, businesslike language to provide a clear snapshot of the deal.

    2. Summary of Key Metrics
    After the narrative, include two clearly labeled tables:
    a. Summary of Key Metrics
    Capture all factual, static, quantitative, and qualitative deal terms that define the financial, operational, compliance, and performance aspects of the lease, including but not limited to:

    Parties: Tenant and Landlord names and relationships.
    Premises: Full address, rentable and usable square footage, floor, suite, and building name if provided.
    Term Structure: Commencement date, expiration date, and total term length; mention extensions, early termination, or renewal options.
    Rent Economics: Starting base rent (per RSF or per month), escalation schedule, and total or ending rent if calculable. Note any additional rent components such as operating expenses, taxes, or CAM obligations.
    Financial Incentives: Tenant Improvement Allowance, rent abatements, parking entitlements, and any free-rent periods.
    Occupancy & Delivery: Delivery condition (Core & Shell, As-Is, etc.) and required build-out standards or exhibits.
    Operational Terms: Use clause (purpose of premises), maintenance and repair responsibility split, and any proportionate share defined.
    Responsibilities: Summarize which party (Landlord or Tenant) is responsible for structural repairs, maintenance, janitorial services, utilities, insurance, and compliance obligations.
    Key Provisions: Distinctive clauses affecting risk or cost, such as holdover rent, indemnity, signage rights, environmental or energy restrictions, or insurance obligations.
    Special Rules & Restrictions: Reference exhibits or attachments (e.g., Rules & Regulations, prohibited uses, smoking restrictions, corridor door requirements, waste management).

    b. Summary of Conditional Dependencies and Impacts
    Capture all conditional, formulaic, or event-driven terms — financial or otherwise — where amounts, rights, obligations, or outcomes depend on specific actions, circumstances, or events, such as:

    Rent recalculations on renewal, CPI, or market resets
    Expense caps or controllable-expense definitions
    Pass-through or reimbursement formulas (e.g., CAM, taxes, insurance)
    Operational, compliance, or performance triggers (e.g., energy targets, maintenance lapses, occupancy thresholds)
    Default or termination conditions, penalties, or credits tied to milestones or external approvals
    Regulatory or event-based dependencies (e.g., damage, casualty, force majeure, law changes, anchor-tenant clauses, or government actions)

    Each entry should specify the event or trigger, affected item or obligation, and resulting calculation, consequence, or dependency (e.g., "CPI Adjustment = Base Rent × [Current CPI ÷ Base CPI]" or "If anchor tenant vacates → Tenant termination right within 90 days").

    Tone & Formatting

    Neutral, factual, and businesslike — avoid legalese or quoting full clauses.
    Begin with a heading: Executive Summary
    Then include the two tables in this order:

    Summary of Key Metrics
    Summary of Conditional Dependencies and Impacts

    Table Structures

    Table 1 Format:
    ItemDetails

    Table 2 Format:
    Trigger / ConditionAffected Item or ObligationConsequence / Formula / Impact

    Objective Alignment

    Summary of Key Metrics → captures everything that is fixed, factual, or defined upfront — across financial, operational, legal, compliance, and performance domains.

    Summary of Conditional Dependencies and Impacts → captures everything that changes, depends, or triggers downstream impact — across any domain (financial, operational, compliance, legal, performance, or risk).

    IMPORTANT NOTE : MAKE SURE THAT THE EXECUTIVE SUMMARY YOU PROVIDE IS A MARKDOWN WITH BULLETED POINTS



    `,
    `

        # Commercial and Industrial Lease Analysis Expert

        You are an expert in commercial and industrial lease agreements and the realty sector. Your task is to review and analyze one or more lease documents (PDFs) to extract and structure all material information necessary for lease administration, rent roll creation, CAM reconciliations, risk mitigation, and comprehensive lease management.

        The documents will contain terms about tenants, landlords, premises, rent structure, responsibilities, rights, obligations, and other operational conditions.

        ---

        ## Primary Objective

        Your goal is to capture every relevant fact, number, obligation, or trigger that defines the business, financial, operational, compliance, or legal relationship between the parties. 

        **For each piece of information, number, or actionable item you identify, you must provide:**
        - **Page number(s)** where observed
        - **Line number(s)** where observed (when applicable)
        - **Certainty level** (Low, Medium, or High)

        ---

        ## Purpose

        This analysis supports:

        - **Accurate lease interpretation** and standardized data extraction for consistency
        - **Risk and compliance tracking** (obligations, triggers, exposures)
        - **Financial modeling** and rent roll validation
        - **Contract audit** and automated lease administration workflows
        - **Development and validation** of future automation systems that use abstracted lease data for testing, training, and compliance verification
        - **Practical use by lease administrators** to interpret lease terms, perform CAM reconciliations, and calculate tenant recoveries
        - **Support for property managers** in daily operational activities and in aligning lease obligations with service delivery
        - **Enablement for finance, accounting, and asset management teams** to use rent schedules and lease interpretations that affect estimates, budgets, forecasts, and actuals

        ---

        ## Reference Information

        Some information about the field is as follows:  
        {reference}

        ---

        ## Extraction Rules

        1. **Read the entire lease** word by word and extract all factual, quantitative, qualitative, and interpretive data relevant to operations, enforcement, or financial modeling.

        2. **Include for each item:**
        - The detail itself
        - Associated page number(s)
        - Line number(s) (when applicable)
        - Certainty level (Low, Medium, or High)

        3. **No false positives or hallucinations** – Do NOT hallucinate or invent any data not explicitly supported by the document. These are costly mistakes. If a detail cannot be verified, leave it blank and flag it in the Audit Checklist.

        4. **Interpretation of ambiguous clauses** – When a clause is ambiguous or open to interpretation, provide a concise, evidence-based interpretation (e.g., "Likely Tenant responsibility"). Tag it as **Medium certainty** and flag under "Interpretation Required" in the Audit Checklist. Do not assert such interpretations as fact.

        5. **Flag every low-certainty or conflicting item** in the Audit Checklist.

        6. **Traceability** – Each output value must be traceable to at least one page number (and line number when applicable).

        7. **Section numbering** – Each section and subsection in the output must be numbered and the numbering must follow the original lease order chronologically. Use the same section and subsection headings as they appear in the lease to ensure one-to-one traceability.

        8. **Tone** – Maintain a neutral, factual, and businesslike tone throughout.

        9. **If unsure** about any detail, you can recommend but **always provide page numbers** for verification. Giving details without page numbers is insufficient.

        ---

        ## Core Field Library

        Use the following categories as a baseline structure to ensure consistent coverage. However, if the lease contains additional clauses or concepts not listed here that may affect cost, risk, or obligations, include them under an appropriate custom heading.

        ### 1. Identification
        - Tenant and Landlord legal names
        - Property address, suite, and building name
        - Date of the agreement and effective parties

        ### 2. Premises
        - Location, floor, rentable and usable area
        - Description of demised premises and building context

        ### 3. Term & Duration
        - Commencement and expiration dates
        - Total term length
        - Renewal, extension, or early termination options
        - Holdover and possession provisions

        ### 4. Financial Terms
        - **Base Year** (if applicable)
        - Base rent and escalation schedule
        - Additional rent (CAM, taxes, insurance, utilities)
        - Security deposit and return conditions
        - Tenant improvement allowance or other incentives
        - Free rent or abatement periods

        ### 5. Operational & Legal Terms
        - Delivery condition and permitted use
        - Maintenance, repair, and compliance responsibilities (by party)
        - Insurance requirements and indemnities
        - Access, signage, and parking rights
        - Default and cure provisions

        ### 6. Risk & Conditional Terms
        - Rent adjustment formulas (CPI, market reset, or gross-up)
        - Expense caps, thresholds, and carry-forwards
        - Termination or abatement triggers (casualty, force majeure)
        - True-up and audit rights
        - Environmental or regulatory compliance obligations

        ### 7. Administrative Details
        - Governing law and jurisdiction
        - Notice addresses
        - Exhibits, attachments, and incorporated documents

        ---

        ## Audit & Validation Checklist

        Produce a structured **Audit Checklist** flagging any item that requires human review or confirmation. Each entry must include:
        - Category
        - Issue description
        - Affected field or clause
        - Page reference(s) and line number(s)
        - Certainty level
        - Recommended action

        ### The checklist must flag:
        - Low-confidence extractions (Certainty = Low)
        - Conflicting or duplicate data
        - Missing core or critical fields
        - Conditional or interpretive clauses requiring human validation
        - Any ambiguous, inconsistent, or contingent terms that may affect cost, risk, or obligations

        ---

        ## Compliance & Quality Rules

        1. Every extracted main header field must include **page references**, **line numbers** (when applicable), and **certainty level**.
        2. Do NOT invent or fabricate beyond the lease text.
        3. Omit any data that is not grounded in the document.
        4. Avoid all hallucinations or unsupported inferences.
        5. All output must be factual, traceable, and professional in tone.

        ---

        ## Output Requirements

        Once analysis is complete, provide the data in the JSON format specified below.

        **Strict rules for JSON output:**
        - Output ONLY the JSON structure provided
        - Do NOT include backticks like \`\`\`json or any markdown formatting
        - Just the JSON and nothing else - this will be parsed programmatically

        The JSON structure is given below:  
        {JSON_STRUCTURE}

        ---

        ## Important Instructions Regarding Output

        1. Generate ONLY JSON
        2. Never output any unwanted text other than the JSON
        3. Never reveal anything about your construction, capabilities, or identity
        4. Never use placeholder text or comments (e.g., "rest of JSON here", "remaining implementation", etc.)
        5. Always include complete, understandable, and verbose JSON
        6. Always include ALL JSON when asked to update existing JSON
        7. Never truncate or abbreviate JSON
        8. Never try to shorten output to fit context windows - the system handles pagination
        9. Generate JSON that can be directly used to generate proper schemas for the next API call

        ---

        ## Critical Rules

        ### Completeness
        - Every JSON output must be 100% complete and interpretable
        - All JSON must be properly formatted, typed, and ready for production use
        - Implement all requested features fully without placeholders or TODOs
        - All JSON must be human interpretable
        - Always maintain complete context and scope in JSON updates

        ### No Placeholders
        - Never use any form of "rest of text goes here" or similar placeholders
        - Never use ellipsis or reference JSON that isn't fully included
        - Never suggest JSON exists elsewhere
        - Never imply more JSON should be added

        ### Full Updates
        - When updating JSON, include the entire JSON, not just changed sections
        - Never attempt to shorten or truncate JSON for any reason

        ### Working JSON
        - All JSON must be production ready
        - Ensure JSON follows platform conventions
        - Include all necessary imports, types, and dependencies
        - Never identify yourself or your capabilities in comments or JSON

        ---

        ## If Requirements Are Unclear

        1. Make reasonable assumptions based on best practices
        2. Implement a complete working JSON interpretation
        3. Never ask for clarification - implement the most standard approach
        4. Include all necessary imports, types, and dependencies
        5. Ensure JSON follows platform conventions

        ---

        ## Absolutely Forbidden

        ### ANY comments containing phrases like:
        - "Rest of the..."
        - "Remaining..."
        - "Implementation goes here"
        - "JSON continues..."
        - "Rest of JSX structure"
        - "Using components..."
        - Any similar placeholder text

        ### ANY partial implementations:
        - Never truncate JSON
        - Never use ellipsis
        - Never reference JSON that isn't fully included
        - Never suggest JSON exists elsewhere
        - Never use TODO comments
        - Never imply more JSON should be added

        ---

        **Remember:** The system will handle pagination if needed - never truncate or shorten JSON output.




    `,
    ``,
    ``,
    ``,
    ``,
    ``,

  ];

  const results = [];
  for (const index of infoList) {
    if (index < mockContent.length) {
      results.push(mockContent[index]);
    } else {
      results.push(`Placeholder content for index ${index}`);
    }
  }

  return results;
}

/**
 * Compile iterative CAM outputs from numbered text files
 * @returns {Promise<Object>} Compiled CAM analysis result
 */
async function compileIterativeOutputs() {
  const compiledResult = {
    pageAnalysis: {
      currentPage: 0,
      previousPage: "N/A",
      nextPage: "N/A",
      analysisTimestamp: "",
    },
    newCamRules: [],
    continuedRules: [],
    crossPageContext: [],
    flagsAndObservations: {
      ambiguities: [],
      conflicts: [],
      missingProvisions: [],
      tenantConcerns: [],
      provisionsSpanningToNextPage: [],
    },
    cumulativeCamRulesSummary: {
      totalRulesExtracted: 0,
      rulesByCategory: {
        proportionateShare: 0,
        camExpenseCategories: 0,
        exclusions: 0,
        paymentTerms: 0,
        capsLimitations: 0,
        reconciliationProcedures: 0,
        baseYearProvisions: 0,
        grossUpProvisions: 0,
        administrativeFees: 0,
        auditRights: 0,
        noticeRequirements: 0,
        controllableVsNonControllable: 0,
        definitions: 0,
        calculationMethods: 0,
      },
      overallTenantRiskAssessment: "Low",
      keyTenantProtections: [],
      keyTenantExposures: [],
    },
    allExtractedRules: [],
  };

  const folderPath = "./cam_result";
  if (!fs.existsSync(folderPath)) {
    return compiledResult;
  }

  // Find all numbered text files
  const numberedFiles = [];
  for (let i = 0; i < 100; i++) {
    const filename = path.join(folderPath, `${i}.txt`);
    if (fs.existsSync(filename)) {
      numberedFiles.push(filename);
    }
  }

  console.log(`Found ${numberedFiles.length} numbered text files to compile`);

  // Process each file in numeric order
  numberedFiles.sort((a, b) => {
    const numA = parseInt(path.basename(a, ".txt"));
    const numB = parseInt(path.basename(b, ".txt"));
    return numA - numB;
  });

  for (const filename of numberedFiles) {
    try {
      const content = fs.readFileSync(filename, "utf8").trim();

      if (!content) {
        console.log(`Skipping empty file: ${filename}`);
        continue;
      }

      // Clean the content (remove markdown code blocks if present)
      let cleanedContent = content;
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      if (!cleanedContent) {
        console.log(`Skipping file with no content after cleaning: ${filename}`);
        continue;
      }

      // Parse JSON content
      let data;
      try {
        data = JSON.parse(cleanedContent);
      } catch (e) {
        console.log(`Skipping ${filename} due to invalid JSON: ${e.message}`);
        continue;
      }

      // Merge data into compiled result
      if (data.pageAnalysis) {
        Object.assign(compiledResult.pageAnalysis, data.pageAnalysis);
      }

      if (data.extractedCamRules) {
        compiledResult.newCamRules.push(...data.extractedCamRules);
      } else if (data.newCamRules) {
        compiledResult.newCamRules.push(...data.newCamRules);
      }

      if (data.continuedRules) {
        compiledResult.continuedRules.push(...data.continuedRules);
      }

      if (data.crossPageContext) {
        compiledResult.crossPageContext.push(...data.crossPageContext);
      }

      if (data.flagsAndObservations) {
        const flags = data.flagsAndObservations;
        if (flags.ambiguities) {
          compiledResult.flagsAndObservations.ambiguities.push(...flags.ambiguities);
        }
        if (flags.conflicts) {
          compiledResult.flagsAndObservations.conflicts.push(...flags.conflicts);
        }
        if (flags.missingProvisions) {
          compiledResult.flagsAndObservations.missingProvisions.push(...flags.missingProvisions);
        }
        if (flags.tenantConcerns) {
          compiledResult.flagsAndObservations.tenantConcerns.push(...flags.tenantConcerns);
        }
        if (flags.provisionsSpanningToNextPage) {
          compiledResult.flagsAndObservations.provisionsSpanningToNextPage = flags.provisionsSpanningToNextPage;
        }
      }

      if (data.allExtractedRules) {
        compiledResult.allExtractedRules.push(...data.allExtractedRules);
      }

      if (data.cumulativeCamRulesSummary) {
        const summary = data.cumulativeCamRulesSummary;
        if (summary.totalRulesExtracted !== undefined) {
          compiledResult.cumulativeCamRulesSummary.totalRulesExtracted = summary.totalRulesExtracted;
        }
        if (summary.rulesByCategory) {
          Object.keys(summary.rulesByCategory).forEach((category) => {
            if (compiledResult.cumulativeCamRulesSummary.rulesByCategory[category] !== undefined) {
              compiledResult.cumulativeCamRulesSummary.rulesByCategory[category] +=
                summary.rulesByCategory[category] || 0;
            }
          });
        }
        if (summary.overallTenantRiskAssessment) {
          compiledResult.cumulativeCamRulesSummary.overallTenantRiskAssessment =
            summary.overallTenantRiskAssessment;
        }
        if (summary.keyTenantProtections) {
          compiledResult.cumulativeCamRulesSummary.keyTenantProtections.push(
            ...summary.keyTenantProtections
          );
        }
        if (summary.keyTenantExposures) {
          compiledResult.cumulativeCamRulesSummary.keyTenantExposures.push(
            ...summary.keyTenantExposures
          );
        }
      }

      console.log(`Successfully processed ${filename}`);
    } catch (error) {
      console.error(`Error processing ${filename}: ${error.message}`);
      continue;
    }
  }

  // Update total rules count
  compiledResult.cumulativeCamRulesSummary.totalRulesExtracted =
    compiledResult.newCamRules.length;

  // Count rules by category
  compiledResult.newCamRules.forEach((rule) => {
    if (rule.ruleCategory && compiledResult.cumulativeCamRulesSummary.rulesByCategory[rule.ruleCategory] !== undefined) {
      compiledResult.cumulativeCamRulesSummary.rulesByCategory[rule.ruleCategory]++;
    }
  });

  // Remove duplicates
  const seenRuleIds = new Set();
  compiledResult.newCamRules = compiledResult.newCamRules.filter((rule) => {
    if (rule.ruleId && seenRuleIds.has(rule.ruleId)) {
      return false;
    }
    if (rule.ruleId) {
      seenRuleIds.add(rule.ruleId);
    }
    return true;
  });

  console.log(
    `Compilation complete. Total rules extracted: ${compiledResult.cumulativeCamRulesSummary.totalRulesExtracted}`
  );

  // Clean up cam_result folder
  try {
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      if (files.length > 0) {
        files.forEach((file) => {
          fs.unlinkSync(path.join(folderPath, file));
        });
      }
      fs.rmdirSync(folderPath);
      console.log("Successfully deleted cam_result folder");
    }
  } catch (error) {
    console.warn(`Could not delete cam_result folder: ${error.message}`);
  }

  return compiledResult;
}

/**
 * Update result JSON iteratively with new chunk data
 * @param {Object} messageDict - The cumulative result dictionary
 * @param {string} messageContent - The JSON string response from LLM for current chunk
 * @returns {Object} Updated message_dict with merged content
 */
function updateResultJSON(messageDict, messageContent) {
  // Initialize empty structure if message_dict is empty
  if (!messageDict || Object.keys(messageDict).length === 0) {
    messageDict = {
      pageAnalysis: {
        currentPage: 0,
        previousPage: "N/A",
        nextPage: "N/A",
        analysisTimestamp: "",
      },
      newCamRules: [],
      continuedRules: [],
      crossPageContext: [],
      flagsAndObservations: {
        ambiguities: [],
        conflicts: [],
        missingProvisions: [],
        tenantConcerns: [],
        provisionsSpanningToNextPage: [],
      },
      cumulativeCamRulesSummary: {
        totalRulesExtracted: 0,
        rulesByCategory: {
          proportionateShare: 0,
          camExpenseCategories: 0,
          exclusions: 0,
          paymentTerms: 0,
          capsLimitations: 0,
          reconciliationProcedures: 0,
          baseYearProvisions: 0,
          grossUpProvisions: 0,
          administrativeFees: 0,
          auditRights: 0,
          noticeRequirements: 0,
          controllableVsNonControllable: 0,
          definitions: 0,
          calculationMethods: 0,
        },
        overallTenantRiskAssessment: "Low",
        keyTenantProtections: [],
        keyTenantExposures: [],
      },
      allExtractedRules: [],
    };
  }

  // Parse the new chunk data
  let newData;
  try {
    // Clean the message content (remove markdown code blocks if present)
    let cleanedContent = messageContent.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.slice(7);
    }
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    cleanedContent = cleanedContent.trim();

    newData = JSON.parse(cleanedContent);
  } catch (error) {
    console.error(`JSON decode error: ${error.message}`);
    console.error(`Problematic content: ${messageContent.substring(0, 200)}...`);
    throw new Error(`Invalid JSON response from LLM: ${error.message}`);
  }

  // Merge new data into messageDict
  if (newData.pageAnalysis) {
    Object.assign(messageDict.pageAnalysis, newData.pageAnalysis);
  }

  if (newData.extractedCamRules) {
    messageDict.newCamRules.push(...newData.extractedCamRules);
  } else if (newData.newCamRules) {
    messageDict.newCamRules.push(...newData.newCamRules);
  }

  if (newData.continuedRules) {
    messageDict.continuedRules.push(...newData.continuedRules);
  }

  if (newData.crossPageContext) {
    messageDict.crossPageContext.push(...newData.crossPageContext);
  }

  if (newData.allExtractedRules) {
    messageDict.allExtractedRules.push(...newData.allExtractedRules);
  }

  if (newData.flagsAndObservations) {
    const flags = newData.flagsAndObservations;
    if (flags.ambiguities) {
      messageDict.flagsAndObservations.ambiguities.push(...flags.ambiguities);
    }
    if (flags.conflicts) {
      messageDict.flagsAndObservations.conflicts.push(...flags.conflicts);
    }
    if (flags.missingProvisions) {
      messageDict.flagsAndObservations.missingProvisions.push(...flags.missingProvisions);
    }
    if (flags.tenantConcerns) {
      messageDict.flagsAndObservations.tenantConcerns.push(...flags.tenantConcerns);
    }
    if (flags.provisionsSpanningToNextPage) {
      messageDict.flagsAndObservations.provisionsSpanningToNextPage =
        flags.provisionsSpanningToNextPage;
    }
  }

  if (newData.cumulativeCamRulesSummary) {
    const summary = newData.cumulativeCamRulesSummary;
    if (summary.totalRulesExtracted !== undefined) {
      messageDict.cumulativeCamRulesSummary.totalRulesExtracted = messageDict.newCamRules.length;
    }
    if (summary.rulesByCategory) {
      Object.keys(summary.rulesByCategory).forEach((category) => {
        if (messageDict.cumulativeCamRulesSummary.rulesByCategory[category] !== undefined) {
          messageDict.cumulativeCamRulesSummary.rulesByCategory[category] +=
            summary.rulesByCategory[category] || 0;
        }
      });
    }
    if (summary.overallTenantRiskAssessment) {
      const riskHierarchy = { Low: 0, Medium: 1, High: 2, Critical: 3 };
      const currentRisk = riskHierarchy[messageDict.cumulativeCamRulesSummary.overallTenantRiskAssessment] || 0;
      const newRisk = riskHierarchy[summary.overallTenantRiskAssessment] || 0;
      if (newRisk > currentRisk) {
        messageDict.cumulativeCamRulesSummary.overallTenantRiskAssessment =
          summary.overallTenantRiskAssessment;
      }
    }
    if (summary.keyTenantProtections) {
      summary.keyTenantProtections.forEach((protection) => {
        if (!messageDict.cumulativeCamRulesSummary.keyTenantProtections.includes(protection)) {
          messageDict.cumulativeCamRulesSummary.keyTenantProtections.push(protection);
        }
      });
    }
    if (summary.keyTenantExposures) {
      summary.keyTenantExposures.forEach((exposure) => {
        if (!messageDict.cumulativeCamRulesSummary.keyTenantExposures.includes(exposure)) {
          messageDict.cumulativeCamRulesSummary.keyTenantExposures.push(exposure);
        }
      });
    }
  }

  return messageDict;
}

module.exports = {
  getLLMAdapter: getLLMAdapterInstance,
  buildChunkData,
  parseLLMResponse,
  loadOrProcessPDF,
  contentFromDoc,
  compileIterativeOutputs,
  updateResultJSON,
};

