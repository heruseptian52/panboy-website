import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const memberBillingPreferences = sqliteTable("member_billing_preferences", {
  memberId: integer("member_id").primaryKey(),
  enabled: integer("enabled").notNull().default(1),
  updatedBy: text("updated_by").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});
export const blacklistPlayers = sqliteTable("blacklist_players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: text("player_id").notNull(),
  playerName: text("player_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  nickname: text("nickname").notNull().default(""),
  reason: text("reason").notNull().default(""),
  evidenceLink: text("evidence_link").notNull().default(""),
  evidenceKey: text("evidence_key").notNull().default(""),
  memberId: integer("member_id").notNull(),
  reporterName: text("reporter_name").notNull().default(""),
  reporterWhatsapp: text("reporter_whatsapp").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  approvedAt: text("approved_at").notNull().default(""),
  reviewedBy: text("reviewed_by").notNull().default(""),
}, table => [index("idx_blacklist_status_approved").on(table.status, table.approvedAt), index("idx_blacklist_player_id").on(table.playerId)]);
export const blacklistSupport = sqliteTable("blacklist_support", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blacklistId: integer("blacklist_id").notNull().references(() => blacklistPlayers.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [uniqueIndex("idx_blacklist_support_member").on(table.blacklistId, table.memberId)]);
export const blacklistFeedback = sqliteTable("blacklist_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blacklistId: integer("blacklist_id").notNull().references(() => blacklistPlayers.id, { onDelete: "cascade" }),
  visitorToken: text("visitor_token").notNull(),
  name: text("name").notNull().default(""),
  comment: text("comment").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, table => [uniqueIndex("idx_blacklist_feedback_unique").on(table.blacklistId, table.visitorToken)]);
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  eventDate: text("event_date").notNull(),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  whatsapp: text("whatsapp").notNull(),
  eventMode: text("event_mode").notNull().default("Online"),
  city: text("city").notNull().default(""),
  province: text("province").notNull().default(""),
  address: text("address").notNull().default(""),
  maxSlots: integer("max_slots").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at").notNull().default(""),
}, (table) => [index("idx_events_public_dates").on(table.deletedAt, table.endDate, table.startDate)]);
export const eventRegistrations = sqliteTable("event_registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  eventId: integer("event_id").notNull(),
  teamId: integer("team_id"),
  teamName: text("team_name").notNull(),
  teamLogo: text("team_logo").notNull(),
  captainName: text("captain_name").notNull().default(""),
  whatsapp: text("whatsapp").notNull(),
  amount: integer("amount").notNull().default(0),
  registrationStatus: text("registration_status")
    .notNull()
    .default("submitted"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentOrderId: text("payment_order_id").notNull().default(""),
  paidAt: text("paid_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_event_registrations_event_payment").on(table.eventId, table.paymentStatus)]);
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull().unique(),
  logoUrl: text("logo_url").notNull().default(""),
  captainName: text("captain_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pubgId: text("pubg_id").notNull().unique(),
  nickname: text("nickname").notNull(),
  fullName: text("full_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  photoUrl: text("photo_url").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const teamPlayers = sqliteTable("team_players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  slotNumber: integer("slot_number").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const registrationRosters = sqliteTable("registration_rosters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => eventRegistrations.id, { onDelete: "cascade" }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  slotNumber: integer("slot_number").notNull(),
  isCaptain: integer("is_captain", { mode: "boolean" })
    .notNull()
    .default(false),
  pubgIdSnapshot: text("pubg_id_snapshot").notNull(),
  nicknameSnapshot: text("nickname_snapshot").notNull(),
  fullNameSnapshot: text("full_name_snapshot").notNull().default(""),
  phoneSnapshot: text("phone_snapshot").notNull().default(""),
  photoUrlSnapshot: text("photo_url_snapshot").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
export const partners = sqliteTable("partners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  linkUrl: text("link_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const communityMembers = sqliteTable("community_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamName: text("team_name").notNull(),
  normalizedName: text("normalized_name").notNull().unique(),
  logoUrl: text("logo_url").notNull(),
  instagramUsername: text("instagram_username").notNull().default(""),
  instagramUrl: text("instagram_url").notNull().default(""),
  tiktokUsername: text("tiktok_username").notNull().default(""),
  tiktokUrl: text("tiktok_url").notNull().default(""),
  playerPhoto1Url: text("player_photo_1_url").notNull().default(""),
  playerPhoto2Url: text("player_photo_2_url").notNull().default(""),
  playerPhoto1X: integer("player_photo_1_x").notNull().default(42),
  playerPhoto1Y: integer("player_photo_1_y").notNull().default(0),
  playerPhoto1Scale: integer("player_photo_1_scale").notNull().default(100),
  playerPhoto2X: integer("player_photo_2_x").notNull().default(58),
  playerPhoto2Y: integer("player_photo_2_y").notNull().default(0),
  playerPhoto2Scale: integer("player_photo_2_scale").notNull().default(100),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const memberBenefits = sqliteTable("member_benefits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  videoUrl: text("video_url").notNull().default(""),
  iconName: text("icon_name").notNull().default("sparkles"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  ctaText: text("cta_text").notNull().default(""),
  ctaUrl: text("cta_url").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  stock: text("stock").notNull().default("Tersedia"),
  adminWhatsapp: text("admin_whatsapp").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productType: text("product_type").notNull(),
  customerName: text("customer_name").notNull(),
  customerWhatsapp: text("customer_whatsapp").notNull(),
  gameId: text("game_id").notNull().default(""),
  notes: text("notes").notNull().default(""),
  total: integer("total").notNull(),
  status: text("status").notNull().default("Pesanan Masuk"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  canEvents: integer("can_events", { mode: "boolean" })
    .notNull()
    .default(false),
  canPartners: integer("can_partners", { mode: "boolean" })
    .notNull()
    .default(false),
  canProducts: integer("can_products", { mode: "boolean" })
    .notNull()
    .default(false),
  canOrders: integer("can_orders", { mode: "boolean" })
    .notNull()
    .default(false),
  canAppearance: integer("can_appearance", { mode: "boolean" })
    .notNull()
    .default(false),
  canLeaderboard: integer("can_leaderboard", { mode: "boolean" })
    .notNull()
    .default(false),
  canLeaderboardDesign: integer("can_leaderboard_design", { mode: "boolean" })
    .notNull()
    .default(false),
  canLiveObs: integer("can_live_obs", { mode: "boolean" })
    .notNull()
    .default(false),
  canMembers: integer("can_members", { mode: "boolean" })
    .notNull()
    .default(false),
  canFinance: integer("can_finance", { mode: "boolean" })
    .notNull()
    .default(false),
  extraPermissions: text("extra_permissions").notNull().default("{}"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  accessExpiresAt: text("access_expires_at"),
  createdAt: text("created_at").notNull(),
});
export const adminCredentials = sqliteTable("admin_credentials", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const analyticsEvents = sqliteTable("analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull(),
  eventType: text("event_type").notNull(),
  path: text("path").notNull(),
  label: text("label").notNull().default(""),
  device: text("device").notNull().default("desktop"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_analytics_events_created_type").on(table.createdAt, table.eventType)]);
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull().default(""),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
export const tournamentStages = sqliteTable("tournament_stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  stageOrder: integer("stage_order").notNull().default(0),
  status: text("status").notNull().default("draft"),
  rosterLocked: integer("roster_locked", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const tournamentGroups = sqliteTable("tournament_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => tournamentStages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  groupOrder: integer("group_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const groupTeams = sqliteTable("group_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id")
    .notNull()
    .references(() => tournamentGroups.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => eventRegistrations.id, { onDelete: "cascade" }),
  slotNumber: integer("slot_number").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const tournamentMatches = sqliteTable("tournament_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => tournamentStages.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => tournamentGroups.id, {
    onDelete: "set null",
  }),
  matchNumber: integer("match_number").notNull(),
  mapName: text("map_name").notNull().default("Erangel"),
  scheduledAt: text("scheduled_at").notNull().default(""),
  roomId: text("room_id").notNull().default(""),
  roomPassword: text("room_password").notNull().default(""),
  status: text("status").notNull().default("scheduled"),
  resultLocked: integer("result_locked", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const checkIns = sqliteTable("check_ins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => tournamentStages.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => eventRegistrations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  checkedAt: text("checked_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
export const matchResults = sqliteTable("match_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id")
    .notNull()
    .references(() => tournamentMatches.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => eventRegistrations.id, { onDelete: "cascade" }),
  placement: integer("placement").notNull(),
  eliminations: integer("eliminations").notNull().default(0),
  placementPoints: integer("placement_points").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const tournamentPenalties = sqliteTable("tournament_penalties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => tournamentStages.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => eventRegistrations.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
});
export const pointSystems = sqliteTable("point_systems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  placementJson: text("placement_json").notNull(),
  eliminationPoint: integer("elimination_point").notNull().default(1),
  tieBreakJson: text("tie_break_json").notNull(),
  specialRules: text("special_rules").notNull().default(""),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const pointSystemVersions = sqliteTable("point_system_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pointSystemId: integer("point_system_id")
    .notNull()
    .references(() => pointSystems.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  adminEmail: text("admin_email").notNull(),
  createdAt: text("created_at").notNull(),
});
export const eventPointSystems = sqliteTable("event_point_systems", {
  eventId: integer("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  pointSystemId: integer("point_system_id")
    .notNull()
    .references(() => pointSystems.id),
  updatedAt: text("updated_at").notNull(),
});
export const pointAdjustments = sqliteTable("point_adjustments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => tournamentStages.id, { onDelete: "cascade" }),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => eventRegistrations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  adminEmail: text("admin_email").notNull(),
  createdAt: text("created_at").notNull(),
});
export const scoreboards = sqliteTable("scoreboards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mode: text("mode").notNull().default("team"),
  pointSystemId: integer("point_system_id").references(() => pointSystems.id, {
    onDelete: "set null",
  }),
  ownerEmail: text("owner_email").notNull(),
  templateUrl: text("template_url").notNull().default(""),
  canvasWidth: integer("canvas_width").notNull().default(1080),
  canvasHeight: integer("canvas_height").notNull().default(1350),
  layoutJson: text("layout_json").notNull().default("{}"),
  overlayToken: text("overlay_token").notNull().default(""),
  activeMatchId: integer("active_match_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const scoreboardTeams = sqliteTable("scoreboard_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scoreboardId: integer("scoreboard_id")
    .notNull()
    .references(() => scoreboards.id, { onDelete: "cascade" }),
  slotNumber: integer("slot_number").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_scoreboard_teams_board_slot").on(table.scoreboardId, table.slotNumber)]);
export const scoreboardMatches = sqliteTable("scoreboard_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scoreboardId: integer("scoreboard_id")
    .notNull()
    .references(() => scoreboards.id, { onDelete: "cascade" }),
  matchNumber: integer("match_number").notNull(),
  mapName: text("map_name").notNull().default(""),
  status: text("status").notNull().default("completed"),
  resultLocked: integer("result_locked", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_scoreboard_matches_board_number").on(table.scoreboardId, table.matchNumber)]);
export const scoreboardResults = sqliteTable("scoreboard_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id")
    .notNull()
    .references(() => scoreboardMatches.id, { onDelete: "cascade" }),
  teamId: integer("team_id")
    .notNull()
    .references(() => scoreboardTeams.id, { onDelete: "cascade" }),
  placement: integer("placement").notNull(),
  eliminations: integer("eliminations").notNull().default(0),
  placementPoints: integer("placement_points").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  calculationMode: text("calculation_mode").notNull().default("auto"),
  manualPoints: integer("manual_points"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_scoreboard_results_match_team_updated").on(table.matchId, table.teamId, table.updatedAt)]);
export const liveLeaderboardConfigs = sqliteTable("live_leaderboard_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scoreboardId: integer("scoreboard_id").notNull().unique().references(() => scoreboards.id, { onDelete: "cascade" }),
  overlayToken: text("overlay_token").notNull().unique(),
  activeTemplateId: text("active_template_id").notNull().default("pubg-style"),
  templatesJson: text("templates_json").notNull().default("[]"),
  stateJson: text("state_json").notNull().default("{}"),
  eliminationEventsJson: text("elimination_events_json").notNull().default("[]"),
  matchEpoch: integer("match_epoch").notNull().default(1),
  displayLimit: text("display_limit").notNull().default("all"),
  side: text("side").notNull().default("right"),
  showLegend: integer("show_legend", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull(),
});

export const financePeriods = sqliteTable("finance_periods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  eventName: text("event_name").notNull().default(""),
  month: integer("month").notNull().default(1),
  year: integer("year").notNull().default(2026),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  deductionPerMember: integer("deduction_per_member").notNull().default(10000),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("ACTIVE"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const financeExpenses = sqliteTable("finance_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id")
    .notNull()
    .references(() => financePeriods.id, { onDelete: "cascade" }),
  eventName: text("event_name").notNull(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull().default("Lainnya"),
  fundingSource: text("funding_source").notNull().default("MEMBER"),
  amount: integer("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  proofUrl: text("proof_url").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("ACTIVE"),
  cancelReason: text("cancel_reason").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const financeSponsorIncome = sqliteTable("finance_sponsor_income", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id"),
  sponsorName: text("sponsor_name").notNull(),
  eventName: text("event_name").notNull().default(""),
  amount: integer("amount").notNull(),
  receivedDate: text("received_date").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("ACTIVE"),
  cancelReason: text("cancel_reason").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const financeRegistrationIncome = sqliteTable("finance_registration_income", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamName: text("team_name").notNull(),
  eventName: text("event_name").notNull(),
  amount: integer("amount").notNull(),
  receivedDate: text("received_date").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("ACTIVE"),
  cancelReason: text("cancel_reason").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const financeOperatingTransfers = sqliteTable("finance_operating_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull(),
  eventName: text("event_name").notNull(),
  sponsorAmount: integer("sponsor_amount").notNull().default(0),
  registrationAmount: integer("registration_amount").notNull().default(0),
  status: text("status").notNull().default("ACTIVE"),
  cancelReason: text("cancel_reason").notNull().default(""),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const financeMemberDeductions = sqliteTable("finance_member_deductions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id")
    .notNull()
    .references(() => financePeriods.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull(),
  teamName: text("team_name").notNull(),
  amount: integer("amount").notNull(),
  createdBy: text("created_by").notNull().default("SYSTEM"),
  status: text("status").notNull().default("ACTIVE"),
  cancelReason: text("cancel_reason").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_finance_member_deductions_period_member").on(table.periodId, table.memberId),
]);

export const rosterEvents = sqliteTable("roster_events", {
  optionsJson: text("options_json").notNull().default("{}"),
  id: integer("id").primaryKey({autoIncrement:true}),
  title: text("title").notNull(),
  deadline: text("deadline").notNull(),
  stopped: integer("stopped").notNull().default(0),
  maxPlayers: integer("max_players").notNull().default(8),
  driveFolderUrl: text("drive_folder_url").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
export const rosterEntries = sqliteTable("roster_entries", {
  zonesJson: text("zones_json").notNull().default("[]"),
  contactPhone: text("contact_phone").notNull().default(""),
  id: integer("id").primaryKey({autoIncrement:true}),
  eventId: integer("event_id").notNull().references(()=>rosterEvents.id,{onDelete:"cascade"}),
  teamName: text("team_name").notNull(),
  playersJson: text("players_json").notNull(),
  logoKey: text("logo_key").notNull().default(""),
  logoName: text("logo_name").notNull().default(""),
  driveStatus: text("drive_status").notNull().default("pending"),
  driveFileId: text("drive_file_id").notNull().default(""),
  editTokenHash: text("edit_token_hash").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table=>[index("idx_roster_entries_event").on(table.eventId),uniqueIndex("idx_roster_entries_event_team").on(table.eventId,table.teamName)]);

export const rosterUploads=sqliteTable("roster_uploads",{
  token: text("token").primaryKey(),
  eventId: integer("event_id").notNull().references(()=>rosterEvents.id,{onDelete:"cascade"}),
  objectKey: text("object_key").notNull(),
  fileName: text("file_name").notNull(),
  expiresAt: text("expires_at").notNull(),
  consumed: integer("consumed").notNull().default(0),
  sizeBytes: integer("size_bytes").notNull().default(0),
  ready: integer("ready").notNull().default(0),
});

export const casterProfiles=sqliteTable("caster_profiles",{
  id: integer("id").primaryKey({autoIncrement:true}),
  name: text("name").notNull(),
  photoUrl: text("photo_url").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  active: integer("active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});
