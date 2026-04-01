import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

type SortDirection = "asc" | "desc";

interface DevUser {
  id: string;
  walletAddress: string;
  displayName: string | null;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isCreator: boolean;
  totalRevenue: number;
  createdAt: string;
}

interface DevSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  category: string | null;
  tags: string[];
  zipCid: string;
  manifestCid: string | null;
  filecoinDealId: string | null;
  pieceCid: string | null;
  filecoinDatasetId: number | null;
  creatorAddress: string;
  priceAmount: number;
  priceCurrency: string;
  encrypted: boolean;
  published: boolean;
  downloads: number;
  fvmContractId: string | null;
  storageType: string;
  createdAt: string;
  updatedAt: string;
}

interface DevPurchase {
  id: string;
  userId: string;
  skillId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  txHash: string | null;
  licenseNftId: string | null;
  downloadToken: string | null;
  tokenExpires: string | null;
  installedAt: string | null;
  createdAt: string;
}

interface DevDbShape {
  users: DevUser[];
  skills: DevSkill[];
  purchases: DevPurchase[];
}

const DEFAULT_DB: DevDbShape = {
  users: [],
  skills: [],
  purchases: [],
};

function getDbFilePath(): string {
  return path.resolve(
    process.cwd(),
    process.env.LOCAL_DATA_FILE || ".local-dev/db.json"
  );
}

function ensureDbFile(): string {
  const filePath = getDbFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
  return filePath;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDb(raw: Partial<DevDbShape> | null | undefined): DevDbShape {
  return {
    users: Array.isArray(raw?.users) ? raw!.users : [],
    skills: Array.isArray(raw?.skills) ? raw!.skills : [],
    purchases: Array.isArray(raw?.purchases) ? raw!.purchases : [],
  };
}

function readDb(): DevDbShape {
  const filePath = ensureDbFile();
  try {
    return normalizeDb(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return clone(DEFAULT_DB);
  }
}

function writeDb(db: DevDbShape): void {
  const filePath = ensureDbFile();
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf8");
}

function containsInsensitive(value: unknown, query: string): boolean {
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

function matchesWhere(record: Record<string, any>, where: Record<string, any> = {}): boolean {
  for (const [key, expected] of Object.entries(where)) {
    if (key === "OR") {
      if (!Array.isArray(expected) || !expected.some((clause) => matchesWhere(record, clause))) {
        return false;
      }
      continue;
    }

    const actual = record[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("contains" in expected) {
        if (!containsInsensitive(actual, String(expected.contains || ""))) {
          return false;
        }
        continue;
      }
      if ("hasSome" in expected) {
        const wanted = Array.isArray(expected.hasSome) ? expected.hasSome : [];
        const actualValues = Array.isArray(actual) ? actual.map(String) : [];
        if (!wanted.some((item: string) => actualValues.includes(String(item)))) {
          return false;
        }
        continue;
      }
      if ("increment" in expected) {
        continue;
      }
    }

    if (actual !== expected) {
      return false;
    }
  }

  return true;
}

function sortRecords<T extends Record<string, any>>(records: T[], orderBy?: Record<string, SortDirection>) {
  if (!orderBy) return records;
  const [[field, direction]] = Object.entries(orderBy) as [string, SortDirection][];
  return [...records].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    if (av == null) return direction === "asc" ? -1 : 1;
    if (bv == null) return direction === "asc" ? 1 : -1;
    return av > bv ? (direction === "asc" ? 1 : -1) : (direction === "asc" ? -1 : 1);
  });
}

function paginate<T>(records: T[], skip = 0, take?: number): T[] {
  const sliced = skip > 0 ? records.slice(skip) : records;
  return typeof take === "number" ? sliced.slice(0, take) : sliced;
}

function withSkill(record: DevPurchase, skills: DevSkill[]) {
  const skill = skills.find((item) => item.id === record.skillId) || null;
  return { ...record, skill };
}

export class JsonDevStore {
  async $connect() {
    ensureDbFile();
  }

  async $disconnect() {}

  user = {
    upsert: async (args: any) => {
      const db = readDb();
      const walletAddress = String(args.where.walletAddress).toLowerCase();
      const existing = db.users.find((user) => user.walletAddress === walletAddress);
      if (existing) {
        Object.assign(existing, clone(args.update || {}));
        writeDb(db);
        return clone(existing);
      }

      const now = new Date().toISOString();
      const created: DevUser = {
        id: randomUUID(),
        displayName: null,
        email: null,
        bio: null,
        avatarUrl: null,
        isCreator: false,
        totalRevenue: 0,
        createdAt: now,
        ...clone(args.create || {}),
        walletAddress,
      };
      db.users.push(created);
      writeDb(db);
      return clone(created);
    },

    findUnique: async (args: any) => {
      const db = readDb();
      const walletAddress = args.where.walletAddress
        ? String(args.where.walletAddress).toLowerCase()
        : undefined;
      const id = args.where.id;
      const found = db.users.find((user) => {
        if (walletAddress) return user.walletAddress === walletAddress;
        if (id) return user.id === id;
        return false;
      });
      return found ? clone(found) : null;
    },
  };

  skill = {
    create: async (args: any) => {
      const db = readDb();
      const now = new Date().toISOString();
      const record: DevSkill = {
        id: randomUUID(),
        name: "",
        slug: "",
        description: "",
        version: "1.0.0",
        category: null,
        tags: [],
        zipCid: "",
        manifestCid: null,
        filecoinDealId: null,
        pieceCid: null,
        filecoinDatasetId: null,
        creatorAddress: "",
        priceAmount: 0,
        priceCurrency: "FREE",
        encrypted: false,
        published: false,
        downloads: 0,
        fvmContractId: null,
        storageType: "local",
        createdAt: now,
        updatedAt: now,
        ...clone(args.data || {}),
      };
      db.skills.push(record);
      writeDb(db);
      return clone(record);
    },

    findMany: async (args: any = {}) => {
      const db = readDb();
      const filtered = db.skills.filter((skill) => matchesWhere(skill, args.where || {}));
      const sorted = sortRecords(filtered, args.orderBy);
      return clone(paginate(sorted, args.skip || 0, args.take));
    },

    count: async (args: any = {}) => {
      const db = readDb();
      return db.skills.filter((skill) => matchesWhere(skill, args.where || {})).length;
    },

    findFirst: async (args: any = {}) => {
      const db = readDb();
      const filtered = db.skills.filter((skill) => matchesWhere(skill, args.where || {}));
      const sorted = sortRecords(filtered, args.orderBy);
      const found = paginate(sorted, args.skip || 0, args.take)[0] || null;
      return found ? clone(found) : null;
    },

    findUnique: async (args: any) => {
      const db = readDb();
      const found = db.skills.find((skill) => {
        if (args.where.id) return skill.id === args.where.id;
        if (args.where.slug) return skill.slug === args.where.slug;
        if (args.where.name) return skill.name === args.where.name;
        return false;
      });
      return found ? clone(found) : null;
    },

    update: async (args: any) => {
      const db = readDb();
      const record = db.skills.find((skill) => skill.id === args.where.id);
      if (!record) {
        throw new Error("Skill not found");
      }

      const data = clone(args.data || {});
      if (data.downloads && typeof data.downloads === "object" && "increment" in data.downloads) {
        record.downloads += Number(data.downloads.increment || 0);
        delete data.downloads;
      }

      Object.assign(record, data, { updatedAt: new Date().toISOString() });
      writeDb(db);
      return clone(record);
    },

    aggregate: async (args: any = {}) => {
      const db = readDb();
      const filtered = db.skills.filter((skill) => matchesWhere(skill, args.where || {}));
      return {
        _sum: {
          downloads: filtered.reduce((sum, skill) => sum + Number(skill.downloads || 0), 0),
        },
      };
    },
  };

  purchase = {
    findFirst: async (args: any = {}) => {
      const db = readDb();
      const found = db.purchases.find((purchase) => matchesWhere(purchase, args.where || {}));
      return found ? clone(found) : null;
    },

    create: async (args: any) => {
      const db = readDb();
      const record: DevPurchase = {
        id: randomUUID(),
        userId: "",
        skillId: "",
        amount: 0,
        currency: "FREE",
        paymentMethod: "local",
        licenseNftId: null,
        downloadToken: null,
        tokenExpires: null,
        installedAt: null,
        createdAt: new Date().toISOString(),
        ...clone(args.data || {}),
        txHash: args.data?.txHash || null,
      };
      db.purchases.push(record);
      writeDb(db);
      return clone(record);
    },

    findMany: async (args: any = {}) => {
      const db = readDb();
      const filtered = db.purchases.filter((purchase) => matchesWhere(purchase, args.where || {}));
      const sorted = sortRecords(filtered, args.orderBy);
      const paged = paginate(sorted, args.skip || 0, args.take);
      if (args.include?.skill) {
        return clone(paged.map((purchase) => withSkill(purchase, db.skills)));
      }
      return clone(paged);
    },
  };
}

export default JsonDevStore;
