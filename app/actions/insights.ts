'use server';


import {
  getCategoryAnomalies as getCategoryAnomaliesImpl,
  getInsightsAdvancedAnalysis as getInsightsAdvancedAnalysisImpl,
  getInsightsBasicAnalysis as getInsightsBasicAnalysisImpl,
  queryInsightsAssistant as queryInsightsAssistantImpl,
} from './insights-analysis';

export async function getInsightsBasicAnalysis() {
  return getInsightsBasicAnalysisImpl();
}

export async function getInsightsAdvancedAnalysis() {
  return getInsightsAdvancedAnalysisImpl();
}

export async function getCategoryAnomalies() {
  return getCategoryAnomaliesImpl();
}

export async function queryInsightsAssistant(input: { question: string; advanced?: boolean }) {
  return queryInsightsAssistantImpl(input);
}
