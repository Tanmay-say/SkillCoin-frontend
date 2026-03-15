// Skillcoin CLI — npm for AI Agent Skills
// This is the main library export for programmatic usage

export { readConfig, writeConfig, getSkillsDir } from "./lib/config";
export { fetchSkill, listMarketplaceSkills, uploadSkill } from "./lib/api";
export { downloadFromCID, saveSkill, isSkillInstalled } from "./lib/download";
