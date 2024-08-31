// endpoints.ts

// Define as URLs base para cada plataforma
export const PLATFORM_HOSTS = {
	BR1: 'https:br1.api.riotgames.com',
	EUN1: 'https://eun1.api.riotgames.com',
	EUW1: 'https://euw1.api.riotgames.com',
	JP1: 'https://jp1.api.riotgames.com',
	KR: 'https://kr.api.riotgames.com',
	LA1: 'https://la1.api.riotgames.com',
	LA2: 'https://la2.api.riotgames.com',
	NA1: 'https://na1.api.riotgames.com',
	OC1: 'https://oc1.api.riotgames.com',
	TR1: 'https://tr1.api.riotgames.com',
	RU: 'https://ru.api.riotgames.com',
	PH2: 'https://ph2.api.riotgames.com',
	SG2: 'https://sg2.api.riotgames.com',
	TH2: 'https://th2.api.riotgames.com',
	TW2: 'https://tw2.api.riotgames.com',
	VN2: 'https://vn2.api.riotgames.com',
};

// Define as URLs base para cada região
export const REGION_HOSTS = {
	AMERICAS: 'https://americas.api.riotgames.com',
	ASIA: 'https://asia.api.riotgames.com',
	EUROPE: 'https://europe.api.riotgames.com',
	SEA: 'https://sea.api.riotgames.com',
};

// URLs específicas para buscar contas, partidas e informações das partidas
export const API_URLS = {
	ACCOUNT_BY_PUUID: (puuid: string) =>
			`riot/account/v1/accounts/by-puuid/${puuid}`,
	MATCH_IDS_BY_PUUID: (puuid: string, start: number = 0, count: number = 20) =>
			`lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`,
	MATCH_DETAILS: (matchId: string) =>
			`lol/match/v5/matches/${matchId}`,
};
