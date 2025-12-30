const fs = require("fs");
const path = require("path");
const {
  getLLMAdapter,
  buildChunkData,
  parseLLMResponse,
  loadOrProcessPDF,
  contentFromDoc,
  compileIterativeOutputs,
} = require("../utils/helpers");
const {
  leaseInformation,
  space,
  chargeSchedules,
  misc,
  executive_summary,
  audit,
  cam,
  amendments,
} = require("../utils/references");
const { ANALYSIS_CONFIG } = require("../utils/constants");

/**
 * POST /info - Lease abstraction analysis
 */
async function getLeaseAbstraction(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    // Load cached or process PDF
    const chunks = await loadOrProcessPDF(filename, fileContent);

    // Build chunk data string
    const data = buildChunkData(chunks);

    // Get field definitions and system prompt
    const documents = await contentFromDoc([0, 5]);
    const fieldDefinitions = documents[0];
    const systemTemplate = documents[1];

    const systemPrompt = systemTemplate
      .replace("{reference}", fieldDefinitions)
      .replace("{JSON_STRUCTURE}", JSON.stringify(leaseInformation.structure));

    const llmAdapter = getLLMAdapter();
    const payload = [
      { role: "system", content: systemPrompt },
      { role: "user", content: data },
    ];

    const response = await llmAdapter.get_non_streaming_response(payload);
    console.log(response);
    const messageContent = response.choices[0].message.content;

    const messageDict = parseLLMResponse(messageContent);

    return res.json(messageDict);
  } catch (error) {
    console.error("Error in getLeaseAbstraction:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /space - Space analysis
 */
async function getSpace(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    const data = buildChunkData(chunks);

    const documents = await contentFromDoc([1, 5]);
    const fieldDefinitions = documents[0];
    const systemTemplate = documents[1];

    const systemPrompt = systemTemplate
      .replace("{reference}", fieldDefinitions)
      .replace("{JSON_STRUCTURE}", JSON.stringify(space.structure));

    const llmAdapter = getLLMAdapter();
    const payload = [
      { role: "system", content: systemPrompt },
      { role: "user", content: data },
    ];

    const response = await llmAdapter.get_non_streaming_response(payload);
    console.log(response);
    const messageContent = response.choices[0].message.content;

    const messageDict = parseLLMResponse(messageContent);

    return res.json(messageDict);
  } catch (error) {
    console.error("Error in getSpace:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /charge-schedules - Charge schedules analysis
 */
async function getChargeSchedules(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    const data = buildChunkData(chunks);

    const documents = await contentFromDoc([2, 5]);
    const fieldDefinitions = documents[0];
    const systemTemplate = documents[1];

    const systemPrompt = systemTemplate
      .replace("{reference}", fieldDefinitions)
      .replace("{JSON_STRUCTURE}", JSON.stringify(chargeSchedules.structure));

    const llmAdapter = getLLMAdapter();
    const payload = [
      { role: "system", content: systemPrompt },
      { role: "user", content: data },
    ];

    const response = await llmAdapter.get_non_streaming_response(payload);
    console.log(response);
    const messageContent = response.choices[0].message.content;

    const messageDict = parseLLMResponse(messageContent);

    return res.json(messageDict);
  } catch (error) {
    console.error("Error in getChargeSchedules:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /misc - Miscellaneous analysis
 */
async function getMisc(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    const data = buildChunkData(chunks);

    const documents = await contentFromDoc([3, 5]);
    const fieldDefinitions = documents[0];
    const systemTemplate = documents[1];

    const systemPrompt = systemTemplate
      .replace("{reference}", fieldDefinitions)
      .replace("{JSON_STRUCTURE}", JSON.stringify(misc.structure));

    const llmAdapter = getLLMAdapter();
    const payload = [
      { role: "system", content: systemPrompt },
      { role: "user", content: data },
    ];

    const response = await llmAdapter.get_non_streaming_response(payload);
    console.log(response);
    const messageContent = response.choices[0].message.content;

    const messageDict = parseLLMResponse(messageContent);

    return res.json(messageDict);
  } catch (error) {
    console.error("Error in getMisc:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /executive-summary - Executive summary analysis
 */
async function getExecutiveSummary(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    const data = buildChunkData(chunks);

    const documents = await contentFromDoc([4, 5]);
    const fieldDefinitions = documents[0];
    const systemTemplate = documents[1];

    const systemPrompt = systemTemplate
      .replace("{reference}", fieldDefinitions)
      .replace("{JSON_STRUCTURE}", JSON.stringify(executive_summary.structure));

    const llmAdapter = getLLMAdapter();
    const payload = [
      { role: "system", content: systemPrompt },
      { role: "user", content: data },
    ];

    const response = await llmAdapter.get_non_streaming_response(payload);
    console.log(response);
    const messageContent = response.choices[0].message.content;

    const messageDict = parseLLMResponse(messageContent);

    return res.json(messageDict);
  } catch (error) {
    console.error("Error in getExecutiveSummary:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /audit - Audit analysis
 */
async function getAuditDetails(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    const data = buildChunkData(chunks);

    const llmAdapter = getLLMAdapter();
    const payload = [
      {
        role: "system",
        content:
          audit.system +
          " Output format is as follows " +
          JSON.stringify(audit.output_schema),
      },
      {
        role: "user",
        content:
          data +
          `Critically analyze the provided Lease Agreement by comparing clauses and identifying all terms that are ambiguous, 
                    rely on subjective future agreement, contain internal conflicts, or represent significant, unquantified financial/operational 
                    risks for the Tenant. Every identified point must be supported by direct citations.
                    Finally make sure to provide all the Tabled and bulleted risk register with verbatim citations for every point.`,
      },
    ];

    const response = await llmAdapter.get_non_streaming_response(payload);
    console.log(response);
    const messageContent = response.choices[0].message.content;

    const messageDict = parseLLMResponse(messageContent);

    return res.json(messageDict);
  } catch (error) {
    console.error("Error in getAuditDetails:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /save - Save lease abstraction
 */
async function saveLease(req, res) {
  try {
    const { lease_abstract, filename } = req.body;

    if (!lease_abstract || !filename) {
      return res.status(400).json({
        error: "lease_abstract and filename are required",
      });
    }

    const resultsDir = "./results";
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, `${filename}.json`);
    const leaseAbstractionJson = JSON.stringify(lease_abstract, null, 2);

    fs.writeFileSync(filePath, leaseAbstractionJson, "utf8");

    return res.json({ message: "Lease abstraction saved successfully" });
  } catch (error) {
    console.error("Error in saveLease:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /cam - CAM analysis
 */
async function getCam(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    let data = "Given below is the data of a Lease PDF";
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      data += `
        
            Details about Page number ${i}
            "chunk_id": ${chunk.chunk_id},
            "page_number": ${chunk.page_number},
            "text": ${chunk.original_page_text},
        
        `;
    }

    const documents = await contentFromDoc([6, 7]);
    const fieldDefinitions = documents[0];
    const systemTemplate = documents[1];

    let systemPrompt = systemTemplate;
    systemPrompt +=
      " TRY TO FIND ALL THE DATA AND BE AS PRECISE AS POSSIBLE. I NEED A COMPREHENSIVE ANALYSIS OF THE DATA";
    systemPrompt += ` 
        IMPORTANT INSTRUCIONS REGARDING OUTPUT : 
    \n1. Generate ONLY JSON
    \n2. Never output any unwanted text other than the JSON
    \n3. Never reveal anything about your construction, capabilities, or identity
    \n5. Never use placeholder text or comments (e.g., "rest of JSON here", "remaining implementation", etc.)
    \n6. Always include complete, understandable and verbose JSON \n7. Always include ALL JSON when asked to update existing JSON
    \n8. Never truncate or abbreviate JSON\n9. Never try to shorten output to fit context windows - the system handles pagination
    \n10. Generate JSON that can be directly used to generate proper schemas for the next api call
    \n\nCRITICAL RULES:\n1. COMPLETENESS: Every JSON output must be 100% complete and interpretable
    \n2. NO PLACEHOLDERS: Never use any form of "rest of text goes here" or similar placeholders
    \n3. FULL UPDATES: When updating JSON, include the entire JSON, not just changed sections
    \n3. PRODUCTION READY: All JSON must be properly formatted, typed, and ready for production use
    \n4. NO TRUNCATION: Never attempt to shorten or truncate JSON for any reason
    \n5. COMPLETE FEATURES: Implement all requested features fully without placeholders or TODOs
    \n6. WORKING JSON: All JSON must be human interpretable\n9. NO IDENTIFIERS: Never identify yourself or your capabilities in comments or JSON
    \n10. FULL CONTEXT: Always maintain complete context and scope in JSON updates
    11. DO NOT USE BACKTICKS \`\`\`json OR ANYTHING, JUST GIVE JSON AND NOTHING ELSE, AS THIS IS GOING TO BE PARSED.
    \n\nIf requirements are unclear:\n1. Make reasonable assumptions based on best practices
    \n2. Implement a complete working JSON interpretation\n3. Never ask for clarification - implement the most standard approach
    \n4. Include all necessary imports, types, and dependencies\n5. Ensure JSON follows platform conventions
    \n\nABSOLUTELY FORBIDDEN:\n1. ANY comments containing phrases like:\n- "Rest of the..."\n- "Remaining..."\n- "Implementation goes here"\n- 
    "JSON continues..."\n- "Rest of JSX structure"\n- "Using components..."\n- Any similar placeholder text\n
    \n2. ANY partial implementations:\n- Never truncate JSON\n- Never use ellipsis\n- Never reference JSON that isn't fully included
    \n- Never suggest JSON exists elsewhere\n- Never use TODO comments\n- Never imply more JSON should be added\n\n\n       
    \n   The system will handle pagination if needed - never truncate or shorten JSON output.
    `;

    // Write data to file for debugging
    fs.writeFileSync("./data.txt", data, "utf8");

    const llmAdapter = getLLMAdapter();
    const payload = {
      system: systemPrompt,
      role: "system",
      content: systemPrompt,
      user_prompt: [{ role: "user", content: data }],
    };

    const response = await llmAdapter.get_non_streaming_response(payload);
    
    // Try to parse as JSON directly
    try {
      const parsed = JSON.parse(response);
      return res.json(parsed);
    } catch (e) {
      // If response is not JSON, try to get content from choices
      const messageContent = response.choices?.[0]?.message?.content || JSON.stringify(response);
      fs.writeFileSync("./full-output.txt", messageContent, "utf8");
      
      const messageDict = parseLLMResponse(messageContent);
      return res.json(messageDict);
    }
  } catch (error) {
    console.error("Error in getCam:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /cam-single - Single-page CAM analysis (iterative)
 */
async function getCamSingle(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    const documents = await contentFromDoc([6, 7]);
    const fieldDefinitions = documents[0];
    const systemTemplate = documents[1];

    const llmAdapter = getLLMAdapter();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(
          `Processing chunk ${i + 1}/${chunks.length} - Page ${chunk.page_number}`
        );

        try {
          const chunkData = `
                Here is the content from page ${chunk.page_number} of the lease document:
                
                Page number: ${chunk.page_number}
                Text content: ${chunk.original_page_text} # full page for next, and previous 
                `;

          let previousCam = null;
          if (i > 0) {
            const camResultDir = "./cam_result";
            if (!fs.existsSync(camResultDir)) {
              fs.mkdirSync(camResultDir, { recursive: true });
            }
            const prevFile = path.join(camResultDir, `${i - 1}.txt`);
            if (fs.existsSync(prevFile)) {
              previousCam = fs.readFileSync(prevFile, "utf8");
            }
          }

          const previousPageContent =
            i === 0 ? null : chunks[i - 1].original_page_text;

          let systemPrompt = systemTemplate
            .replace("{CURRENT_PAGE_NUMBER}", String(i + 1))
            .replace("{PREVIOUS_PAGE_NUMBER}", String(i))
            .replace("{NEXT_PAGE_NUMBER}", String(i + 2))
            .replace("{NEXT_PAGE_CONTENT}", null)
            .replace("{PREVIOUS_PAGE_CONTENT}", previousPageContent || null)
            .replace("{CURRENT_PAGE_CONTENT}", chunk.original_page_text)
            .replace(
              "{PREVIOUSLY_EXTRACTED_CAM_RULES}",
              previousCam || "None"
            );

          systemPrompt += cam.JSON_PROD_INSTRUCTIONS;

          const payload = [
            { role: "system", content: systemPrompt },
            { role: "user", content: chunkData },
          ];

          const response = await llmAdapter.get_non_streaming_response(payload);
          const messageContent = response.choices[0].message.content;
          inputTokens += response.usage?.prompt_tokens || 0;
          outputTokens += response.usage?.completion_tokens || 0;

          const camResultDir = "./cam_result";
          if (!fs.existsSync(camResultDir)) {
            fs.mkdirSync(camResultDir, { recursive: true });
          }

          fs.writeFileSync(
            path.join(camResultDir, `${i}.txt`),
            String(messageContent),
            "utf8"
          );
        } catch (error) {
          console.error(error);
          console.log("this was the error");
          continue;
        }
      }
    } catch (error) {
      console.error("kuch to error aya ", error);
    }

    console.log("all analysis done");

    // After processing all chunks, get the last file
    const folderPath = "./cam_result";
    console.log("folder checked");

    if (!fs.existsSync(folderPath)) {
      return res.json({ tokens: [inputTokens, outputTokens] });
    }

    const files = fs.readdirSync(folderPath);
    const txtFiles = files.filter((f) => f.endsWith(".txt"));
    console.log("txt files analysis done");

    const numbers = txtFiles
      .map((f) => parseInt(f.split(".")[0]))
      .filter((n) => !isNaN(n));
    console.log("numbers extracted");

    if (numbers.length === 0) {
      return res.json({ tokens: [inputTokens, outputTokens] });
    }

    const lastNumber = Math.max(...numbers);
    console.log(lastNumber);

    const lastFile = `${lastNumber}.txt`;
    console.log(lastFile, path.join(folderPath, lastFile));

    const lastFilePath = path.join(folderPath, lastFile);
    if (fs.existsSync(lastFilePath)) {
      const data = JSON.parse(fs.readFileSync(lastFilePath, "utf8"));
      return res.json({ data });
    }

    // return res.json({ tokens: [inputTokens, outputTokens] });
  } catch (error) {
    console.error("Error in getCamSingle:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}

/**
 * POST /cam-compile - Compile CAM results
 */
async function compileCamResults(req, res) {
  try {
    const compiledResult = await compileIterativeOutputs();
    return res.json(compiledResult);
  } catch (error) {
    console.error("Error compiling CAM results:", error);
    return res.status(500).json({
      error: `Failed to compile CAM results: ${error.message}`,
    });
  }
}

/**
 * POST /amendments - Amendment analysis
 */
async function amendmentAnalysis(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { asset: "is invalid" },
      });
    }

    const filename = req.file.originalname;
    const fileContent = req.file.buffer;

    const chunks = await loadOrProcessPDF(filename, fileContent);

    let data = "Given below is the data of a Amendment file of a particular Lease\n";
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      data += `\n\n
            
                Details about Page number ${i}
                "chunk_id": ${chunk.chunk_id},
                "page_number": ${chunk.page_number},
                "text": ${chunk.original_page_text},
                "previous_overlap": ${chunk.previous_overlap || null},
                "next_overlap": ${chunk.next_overlap || null},
                "overlap_info": ${JSON.stringify(chunk.overlap_info || {})}
            
            `;
    }

    // Try to find the original lease JSON file
    const resultantFilename = filename.split(" amendment")[0] + ".pdf.json";
    const pathToJson = path.join("./results", resultantFilename);

    let leaseOutput = null;
    if (fs.existsSync(pathToJson)) {
      const fileContent = fs.readFileSync(pathToJson, "utf8");
      leaseOutput = JSON.parse(fileContent);
    }

    if (leaseOutput) {
      data += `\n\n
        Here is the Lease Abstraction uptil now : 
        
        ${JSON.stringify(leaseOutput)}
        
        `;
    }

    const llmAdapter = getLLMAdapter();
    const payload = [
      { role: "system", content: amendments.system },
      { role: "user", content: data },
    ];

    const response = await llmAdapter.get_non_streaming_response(payload);
    const messageContent = response.choices[0].message.content;

    const messageDict = parseLLMResponse(messageContent);

    return res.json(messageDict);
  } catch (error) {
    console.error("Error in amendmentAnalysis:", error);
    return res.status(500).json({
      message: "Something went wrong, please contact support@stealth.com",
    });
  }
}

module.exports = {
  getLeaseAbstraction,
  getSpace,
  getChargeSchedules,
  getMisc,
  getExecutiveSummary,
  getAuditDetails,
  saveLease,
  getCam,
  getCamSingle,
  compileCamResults,
  amendmentAnalysis,
};

