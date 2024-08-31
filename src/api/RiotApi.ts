import axios, { AxiosResponse } from "axios";
import { prisma } from "../main";
import { env } from "../config";
// Riot Games
// ModelsDto
import { AccountDto } from "./models-dto/account";
import { MatchDto } from "./models-dto/match";
// Endpoints
import { API_URLS, REGION_HOSTS } from "./endpoints";

export class RiotApi {
  private isSearching = false;
  private isPaused = false;
  private searchInterval: NodeJS.Timeout | null = null;

  public startSearching(intervalMs: number) {
    this.stopSearching(); // Para garantir que não haja intervalos duplicados
    this.searchInterval = setInterval(() => this.fetchData(), intervalMs);
  }

  public stopSearching() {
    if (this.searchInterval) {
      clearInterval(this.searchInterval);
      this.searchInterval = null;
    }
  }

  public pauseSearch() {
    this.isPaused = true;
  }

  public resumeSearch() {
    this.isPaused = false;
  }

  private async fetchData() {
    if (this.isSearching || this.isPaused) return;

    this.isSearching = true;

    try {
      const account = await this.getAccountToAnalyze();
      if (account) {
        await this.analyzeAccount(account);
      } else {
        const match = await this.getMatchToAnalyze();
        if (match) await this.analyzeMatch(match);
      }
    } finally {
      this.isSearching = false;
    }
  }

  private async getAccountToAnalyze() {
    return prisma.accounts_analyzed.findFirst({
      where: { status: { in: ["ANALYZING", "NOT_ANALYZED"] } },
      orderBy: [{ status: "asc" }, { id: "asc" }],
    });
  }

  private async analyzeAccount(account: any) {
    if (account.status === "NOT_ANALYZED") {
      await prisma.accounts_analyzed.update({
        data: { status: "ANALYZING" },
        where: { puuID: account.puuID },
      });
    }

    console.log(`[account] Analyzing: ${account.gameName}#${account.tagName} | ${account.puuID}`);
		
    await this.processAccountMatches(account.puuID);
  }

  private async processAccountMatches(puuID: string) {
		console.log(`[matches] Searching matches...`);
    for (let i = 0; i < 150000; i += 100) {
      const matches = await this.fetchMatchesByPUUID(puuID, i, 100);
      
      for (const matchId of matches) {
        await this.processMatch(matchId);
      }

			if (!matches.length || matches.length != 100) break;
    }
		await prisma.accounts_analyzed.update({
			data: {
				status: "ANALYZED",
				analyzed_at: {
					set: new Date()
				}
			},
			where: {
				puuID: puuID
			}
		})
  }

  private async fetchMatchesByPUUID(puuID: string, start: number, count: number): Promise<string[]> {
    try {
      const response = await axios.get(`${REGION_HOSTS.AMERICAS}/${API_URLS.MATCH_IDS_BY_PUUID(puuID, start, count)}`, {
        headers: { "X-Riot-Token": env.RIOT_API_KEY },
      });
      return response.data as string[];
    } catch (error: any) {
      await this.handleAxiosError(error);
			return this.fetchMatchesByPUUID(puuID, start, count);
    }
  }

  private async processMatch(matchId: string) {
		
    const match = await prisma.matches_analyzed.findUnique({ where: { match_id: matchId } });
    if (match) {
      if (match.status === "ANALYZED") {
				console.log(`[matches] ${matchId} | Match Alreay analized...`)
				return;
			}
      if (match.status === "ANALYZING" || match.status === "NOT_ANALYZED") {
        await this.fetchAndStoreMatchData(match.match_id);
      }
    } else {
      await prisma.matches_analyzed.create({ data: { match_id: matchId, status: "ANALYZING" } });
      await this.fetchAndStoreMatchData(matchId);
    }
		await prisma.matches_analyzed.update({
			data: {
				status: "ANALYZED",
				analyzed_at: {
					set: new Date()
				}
			}, 
			where: {
				match_id: matchId
			}
		})
  }

  private async fetchAndStoreMatchData(matchId: string): Promise<any> {
		console.log(`[matches] ${matchId} | Storing data...`)
    try {
      const response = await axios.get(`${REGION_HOSTS.AMERICAS}/${API_URLS.MATCH_DETAILS(matchId)}`, {
        headers: { "X-Riot-Token": env.RIOT_API_KEY },
      });
			const matchData = response.data as MatchDto;
			
			const analyzed_match = await prisma.matches_info.findUnique({
				where: {
					match_id: matchId
				}
			})
			if(analyzed_match) return;
      
			let championsTeam: string = "";
			let deaths: number = 0;
			let kills: number = 0;
			let assists: number = 0;
			let dragonKills: number = 0;
			let baronKilles: number = 0;
			let heraldKilles: number = 0;
			let doubleKill: number = 0;
			let tripleKill: number = 0;
			let quadraKill: number = 0;
			let pentaKill: number = 0;
			let turretKills: number = 0;
			let firstBlood: number = 0;
			let firstTower: number = 0;
			let spellCast: number = 0;
			let bans: string = "";
			for(let i = 0; i < matchData.info.teams.length; i++)
			{
				dragonKills += matchData.info.teams[i].objectives.dragon.kills;
				baronKilles += matchData.info.teams[i].objectives.baron.kills;
				heraldKilles += matchData.info.teams[i].objectives.riftHerald.kills;
				turretKills += matchData.info.teams[i].objectives.tower.kills;
				for(let j = 0; j < matchData.info.teams[i].bans.length; j++)
				{
					bans += `${matchData.info.teams[i].teamId}:${matchData.info.teams[i].bans[j].championId}|`
				}
				
			}
			let sumonners_failed:number = 0;
			let sumonners_sucess:number = 0;
			let sumonners_alread:number = 0;
			for(let i = 0; i < matchData.info.participants.length; i++)
			{

				const already_account = await prisma.accounts_analyzed.findUnique({
					where: {
						puuID: matchData.metadata.participants[i]
					}
				});
				if(already_account){
					sumonners_alread++;
					continue;
				} else {
					let summom = await prisma.accounts_analyzed.create({
						data: {
							puuID: matchData.info.participants[i].puuid,
							status: "NOT_ANALYZED",
							gameName: matchData.info.participants[i].riotIdGameName,
							tagName: matchData.info.participants[i].riotIdTagline
						}
					})
					if(summom)
					{
						sumonners_sucess++;
					} else {
						sumonners_failed++;
						await prisma.accounts_analyzed.create({
							data: {
								puuID: matchData.info.participants[i].puuid,
								status: "NOT_ANALYZED",
								gameName: "404",
								tagName: matchData.info.participants[i].riotIdTagline
							}
						})
					}
				}

				championsTeam += `${matchData.info.participants[i].teamId}:${matchData.info.participants[i].championId}|`

				deaths += matchData.info.participants[i].deaths;
				kills += matchData.info.participants[i].kills;
				assists += matchData.info.participants[i].assists;
				
				doubleKill += matchData.info.participants[i].doubleKills;
				tripleKill += matchData.info.participants[i].tripleKills;
				quadraKill += matchData.info.participants[i].quadraKills;
				pentaKill += matchData.info.participants[i].pentaKills;
				spellCast += matchData.info.participants[i].spell1Casts + matchData.info.participants[i].spell2Casts + matchData.info.participants[i].spell3Casts + matchData.info.participants[i].spell4Casts;
				if(matchData.info.participants[i].firstBloodKill)
					firstBlood = matchData.info.participants[i].teamId;
				if(matchData.info.participants[i].firstTowerKill)
					firstTower = matchData.info.participants[i].teamId;
			}

			let matchInfo = await prisma.matches_info.create({
				data: {
					gameCreation: matchData.info.gameCreation,
					gameDuration: matchData.info.gameDuration,
					gameMode: matchData.info.gameMode,
					gameName: matchData.info.gameName,
					gameStartTimestamp: matchData.info.gameStartTimestamp,
					gameType: matchData.info.gameType,
					gameVersion: matchData.info.gameVersion,
					match_id: matchId,
					mapId: matchData.info.mapId,
					championsTeam: championsTeam,
					deaths: deaths,
					kills: kills,
					assistis: assists,
					dragonKilleds: dragonKills,
					baronKilles: baronKilles,
					heraldKilles: heraldKilles,
					doubleKill: doubleKill,
					tripleKill: tripleKill,
					quadraKill: quadraKill,
					pentaKill: pentaKill,
					turretsKilled: turretKills,
					firstBlood: firstBlood,
					firstTower: firstTower,
					spellCast: spellCast,
					queueId: matchData.info.queueId,
					bans: bans
				}
			})
			if(matchInfo)
				console.log(`[matches] ${matchId} |=> Storing Info [🟩]`)
			else 
				console.log(`[matches] ${matchId} |=> Storing Info [🟥]`)
			
			console.log(`[matches] ${matchId} |==> Legendas:  S/F/A`);
			console.log(`[matches] ${matchId} |==> Jogadores: ${sumonners_sucess}/${sumonners_failed}/${sumonners_alread}`);
    } catch (error: any) {
      await this.handleAxiosError(error);
			return this.fetchAndStoreMatchData(matchId);
    }
  }

  private async getMatchToAnalyze() {
    return prisma.matches_analyzed.findFirst({
      where: { status: { in: ["ANALYZING", "NOT_ANALYZED"] } },
      orderBy: [{ status: "asc" }, { id: "asc" }],
    });
  }

  private async analyzeMatch(match: any) {
    await this.fetchAndStoreMatchData(match.match_id);
  }

  private async handleAxiosError(error: any) {
    const response = error.response as AxiosResponse<any, any>;
    if (response?.status === 429) {
      console.log(`[API] Rate limit hit: retrying after ${response.headers["retry-after"]} seconds`);
      return await this.waitFor(parseInt(response.headers["retry-after"]) * 1000);
    }
    console.error("[API] Request failed:", error);
  }

  private async waitFor(ms: number) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
