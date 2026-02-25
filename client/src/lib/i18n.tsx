import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Language = "en" | "th";

const translations: Record<string, Record<Language, string>> = {
  "app.title": { en: "API Weaver", th: "API Weaver" },
  "nav.home": { en: "Home", th: "หน้าแรก" },
  "nav.guide": { en: "Guide", th: "คู่มือ" },
  "nav.users": { en: "Users", th: "ผู้ใช้" },
  "nav.terms": { en: "Terms", th: "ข้อกำหนด" },
  "nav.license": { en: "License", th: "ใบอนุญาต" },
  "nav.playground": { en: "Playground", th: "ทดสอบ API" },
  "nav.analytics": { en: "Analytics", th: "การวิเคราะห์" },
  "nav.status": { en: "Status", th: "สถานะ" },
  "nav.teams": { en: "Teams", th: "ทีม" },
  "nav.a2a": { en: "A2A Chat", th: "แชท A2A" },
  "nav.login": { en: "Sign In", th: "เข้าสู่ระบบ" },
  "nav.logout": { en: "Sign Out", th: "ออกจากระบบ" },

  "theme.light": { en: "Light", th: "สว่าง" },
  "theme.dark": { en: "Dark", th: "มืด" },
  "theme.system": { en: "System", th: "ตามระบบ" },

  "common.loading": { en: "Loading...", th: "กำลังโหลด..." },
  "common.error": { en: "Error", th: "ข้อผิดพลาด" },
  "common.save": { en: "Save", th: "บันทึก" },
  "common.cancel": { en: "Cancel", th: "ยกเลิก" },
  "common.delete": { en: "Delete", th: "ลบ" },
  "common.copy": { en: "Copy", th: "คัดลอก" },
  "common.copied": { en: "Copied!", th: "คัดลอกแล้ว!" },
  "common.export": { en: "Export", th: "ส่งออก" },
  "common.settings": { en: "Settings", th: "ตั้งค่า" },
  "common.search": { en: "Search", th: "ค้นหา" },
  "common.noData": { en: "No data", th: "ไม่มีข้อมูล" },
  "common.status": { en: "Status", th: "สถานะ" },
  "common.completed": { en: "Completed", th: "เสร็จสิ้น" },
  "common.running": { en: "Running", th: "กำลังทำงาน" },
  "common.send": { en: "Send", th: "ส่ง" },
  "common.back": { en: "Back", th: "กลับ" },
  "common.newConversation": { en: "New Conversation", th: "สนทนาใหม่" },

  "landing.title": { en: "API Weaver", th: "API Weaver" },
  "landing.subtitle": { en: "MCP Architecture Platform", th: "แพลตฟอร์ม MCP Architecture" },
  "landing.description": {
    en: "A comprehensive API gateway with multi-AI agent collaboration, real-time monitoring, and enterprise-grade security.",
    th: "เกตเวย์ API ครบวงจร พร้อม AI หลายตัวทำงานร่วมกัน, ตรวจสอบแบบเรียลไทม์ และความปลอดภัยระดับองค์กร",
  },
  "landing.getStarted": { en: "Get Started", th: "เริ่มต้นใช้งาน" },
  "landing.viewDocs": { en: "View Documentation", th: "ดูเอกสาร" },
  "landing.features": { en: "Features", th: "ฟีเจอร์" },

  "a2a.title": { en: "A2A Multi-Agent Chat", th: "แชท A2A หลายเอเจนต์" },
  "a2a.subtitle": {
    en: "Enter a topic below and let multiple AI agents collaborate. Select agents and a conversation mode from the sidebar.",
    th: "ป้อนหัวข้อด้านล่าง แล้วให้ AI หลายตัวร่วมมือกัน เลือกเอเจนต์และโหมดสนทนาจากแถบด้านข้าง",
  },
  "a2a.multiAgentChat": { en: "Multi-Agent Chat", th: "แชทหลายเอเจนต์" },
  "a2a.newConversation": { en: "New Conversation", th: "สนทนาใหม่" },
  "a2a.settings": { en: "Settings", th: "ตั้งค่า" },
  "a2a.mode": { en: "Mode", th: "โหมด" },
  "a2a.rounds": { en: "Rounds", th: "รอบ" },
  "a2a.agents": { en: "Agents", th: "เอเจนต์" },
  "a2a.selected": { en: "selected", th: "เลือกแล้ว" },
  "a2a.selectAtLeast2": { en: "Select at least 2", th: "เลือกอย่างน้อย 2 ตัว" },
  "a2a.noKey": { en: "No key", th: "ไม่มีคีย์" },
  "a2a.history": { en: "History", th: "ประวัติ" },
  "a2a.noConversations": { en: "No conversations yet", th: "ยังไม่มีสนทนา" },
  "a2a.msgs": { en: "msgs", th: "ข้อความ" },
  "a2a.thinking": { en: "is thinking...", th: "กำลังคิด..." },
  "a2a.agentsDiscussing": { en: "AI Agents are discussing...", th: "AI เอเจนต์กำลังสนทนา..." },
  "a2a.enterTopic": {
    en: "Enter a topic for AI agents to discuss...",
    th: "ป้อนหัวข้อให้ AI เอเจนต์สนทนา...",
  },
  "a2a.selectAgentsFirst": {
    en: "Select at least 2 agents from the sidebar first...",
    th: "เลือกอย่างน้อย 2 เอเจนต์จากแถบด้านข้างก่อน...",
  },
  "a2a.round": { en: "Round", th: "รอบ" },
  "a2a.finalSummary": { en: "Final Summary", th: "สรุปสุดท้าย" },
  "a2a.consensusSummary": { en: "Consensus Summary", th: "สรุปฉันทามติ" },
  "a2a.conversationCompleted": { en: "Conversation completed", th: "สนทนาเสร็จสิ้น" },
  "a2a.messagesAcross": { en: "messages across", th: "ข้อความ ใน" },
  "a2a.sessionDeleted": { en: "Session deleted", th: "ลบเซสชันแล้ว" },
  "a2a.clearAll": { en: "Clear All", th: "ล้างทั้งหมด" },
  "a2a.allCleared": { en: "All sessions cleared", th: "ล้างเซสชันทั้งหมดแล้ว" },
  "a2a.confirmClear": { en: "Clear all conversations?", th: "ล้างสนทนาทั้งหมด?" },
  "assistant.clear": { en: "Clear", th: "ล้าง" },
  "assistant.cleared": { en: "Cleared", th: "ล้างแล้ว" },
  "a2a.trySuggestion": { en: "Try a suggested topic", th: "ลองหัวข้อแนะนำ" },
  "a2a.enterToSend": { en: "Enter to send", th: "Enter เพื่อส่ง" },
  "a2a.tokens": { en: "tokens", th: "โทเค็น" },
  "a2a.messages": { en: "messages", th: "ข้อความ" },
  "a2a.exportJSON": { en: "Export JSON", th: "ส่งออก JSON" },
  "a2a.exportMarkdown": { en: "Export Markdown", th: "ส่งออก Markdown" },
  "a2a.chain.label": { en: "Chain", th: "ลูกโซ่" },
  "a2a.chain.description": { en: "Agents pass insights sequentially", th: "เอเจนต์ส่งต่อข้อมูลเรียงลำดับ" },
  "a2a.debate.label": { en: "Debate", th: "อภิปราย" },
  "a2a.debate.description": { en: "Agents argue different perspectives", th: "เอเจนต์ถกเถียงมุมมองต่างกัน" },
  "a2a.consensus.label": { en: "Consensus", th: "ฉันทามติ" },
  "a2a.consensus.description": {
    en: "All respond independently, then synthesize",
    th: "ทุกตัวตอบอิสระ แล้วสรุปรวม",
  },
  "a2a.subAgent.label": { en: "Sub-Agent", th: "มอบหมายงาน" },
  "a2a.subAgent.description": { en: "Lead agent delegates to others", th: "หัวหน้ามอบหมายงานให้คนอื่น" },
  "a2a.roundsLabel": { en: "rounds", th: "รอบ" },

  "dashboard.overview": { en: "Overview", th: "ภาพรวม" },
  "dashboard.integrations": { en: "Integrations", th: "การเชื่อมต่อ" },
  "dashboard.aiAssistant": { en: "AI Assistant", th: "ผู้ช่วย AI" },
  "dashboard.monitoring": { en: "Monitoring", th: "ตรวจสอบ" },
  "dashboard.logs": { en: "Logs", th: "บันทึก" },
  "dashboard.security": { en: "Security", th: "ความปลอดภัย" },
  "dashboard.alerts": { en: "Alerts", th: "การแจ้งเตือน" },
  "dashboard.settings": { en: "Settings", th: "ตั้งค่า" },
  "dashboard.endpoints": { en: "Endpoints", th: "จุดเชื่อมต่อ" },
  "dashboard.devTools": { en: "Developer Tools", th: "เครื่องมือนักพัฒนา" },
  "dashboard.totalRequests": { en: "Total Requests", th: "คำขอทั้งหมด" },
  "dashboard.successRate": { en: "Success Rate", th: "อัตราสำเร็จ" },
  "dashboard.avgResponseTime": { en: "Avg Response Time", th: "เวลาตอบสนองเฉลี่ย" },
  "dashboard.activeServices": { en: "Active Services", th: "บริการที่ใช้งาน" },
  "dashboard.apiTraffic": { en: "API Traffic", th: "การรับส่ง API" },
  "dashboard.requestMethods": { en: "Request Methods", th: "วิธีการร้องขอ" },
  "dashboard.responseTime": { en: "Response Time", th: "เวลาตอบสนอง" },

  "guide.title": { en: "User Guide", th: "คู่มือผู้ใช้" },
  "guide.gettingStarted": { en: "Getting Started", th: "เริ่มต้นใช้งาน" },
  "guide.architecture": { en: "Architecture", th: "สถาปัตยกรรม" },
  "guide.services": { en: "Services", th: "บริการ" },
  "guide.apiReference": { en: "API Reference", th: "เอกสาร API" },
  "guide.deployment": { en: "Deployment", th: "การติดตั้ง" },

  "status.title": { en: "System Status", th: "สถานะระบบ" },
  "status.allOperational": { en: "All Systems Operational", th: "ระบบทั้งหมดทำงานปกติ" },
  "status.degraded": { en: "Degraded Performance", th: "ประสิทธิภาพลดลง" },
  "status.down": { en: "System Down", th: "ระบบหยุดทำงาน" },
  "status.uptime": { en: "Uptime", th: "เวลาทำงาน" },
  "status.incidents": { en: "Incidents", th: "เหตุการณ์" },

  "teams.title": { en: "Team Management", th: "จัดการทีม" },
  "teams.createTeam": { en: "Create Team", th: "สร้างทีม" },
  "teams.members": { en: "Members", th: "สมาชิก" },
  "teams.role": { en: "Role", th: "บทบาท" },

  "login.title": { en: "Welcome Back", th: "ยินดีต้อนรับกลับ" },
  "login.subtitle": { en: "Sign in to your account", th: "เข้าสู่ระบบบัญชีของคุณ" },

  "notFound.title": { en: "Page Not Found", th: "ไม่พบหน้า" },
  "notFound.description": { en: "The page you're looking for doesn't exist.", th: "หน้าที่คุณกำลังค้นหาไม่มีอยู่" },
  "notFound.goBack": { en: "Go Back Home", th: "กลับหน้าแรก" },

  "language.switch": { en: "ภาษาไทย", th: "English" },
  "language.current": { en: "EN", th: "TH" },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
  toggleLanguage: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved === "th" || saved === "en") ? saved : "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "th" : "en");
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string): string => {
      return translations[key]?.[language] || key;
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
