export { readConfig, writeConfig, getSkillsDir, type SkillcoinConfig } from "./lib/config";
export { fetchSkill, listMarketplaceSkills, uploadSkill } from "./lib/api";
export { downloadFromCID, saveSkill, isSkillInstalled } from "./lib/download";
export { uploadWithFilecoinPin, isFilecoinPinAvailable } from "./lib/filecoin-pin";
export { createAiChat, type AiChat, type AiMessage } from "./lib/ai-provider";
export {
  generateClarificationQuestions,
  generateProjectSpec,
  generateProjectPlanMarkdown,
  writeProjectBundle,
  type ProjectSpec,
  type ClarificationAnswer,
} from "./lib/project";
