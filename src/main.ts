// Prisma
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
// API
import { RiotApi } from "./api/RiotApi";
const riot = new RiotApi();

( async () => {
	riot.startSearching(1000)

})();