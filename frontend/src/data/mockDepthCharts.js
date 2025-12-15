// FRONTEND (React/Vite) — Fallback mock depth chart (used if API key missing / fetch fails)

export const mockDepthCharts = {
  offense: {
    LT: { id: 101, first_name: "B.", last_name: "Jones", position_abbreviation: "LT", team: "CHI", jersey_number: "70", headshotUrl: null },
    LG: { id: 102, first_name: "J.", last_name: "Thuney", position_abbreviation: "LG", team: "CHI", jersey_number: "62", headshotUrl: null },
    C:  { id: 103, first_name: "D.", last_name: "Dalman", position_abbreviation: "C",  team: "CHI", jersey_number: "67", headshotUrl: null },
    RG: { id: 104, first_name: "J.", last_name: "Jackson", position_abbreviation: "RG", team: "CHI", jersey_number: "73", headshotUrl: null },
    RT: { id: 105, first_name: "D.", last_name: "Wright", position_abbreviation: "RT", team: "CHI", jersey_number: "71", headshotUrl: null },
    TE: { id: 106, first_name: "C.", last_name: "Kmet", position_abbreviation: "TE", team: "CHI", jersey_number: "85", headshotUrl: null },

    WR1: { id: 201, first_name: "D.", last_name: "Moore", position_abbreviation: "WR", team: "CHI", jersey_number: "2", headshotUrl: null },
    HB:  { id: 202, first_name: "R.", last_name: "Johnson", position_abbreviation: "RB", team: "CHI", jersey_number: "23", headshotUrl: null },
    QB:  { id: 203, first_name: "C.", last_name: "Williams", position_abbreviation: "QB", team: "CHI", jersey_number: "18", headshotUrl: null },
    FB:  { id: 204, first_name: "C.", last_name: "Loveland", position_abbreviation: "FB", team: "CHI", jersey_number: "45", headshotUrl: null },
    WR2: { id: 205, first_name: "R.", last_name: "Odunze", position_abbreviation: "WR", team: "CHI", jersey_number: "13", headshotUrl: null },
  },

  defense: {
    CB1: { id: 301, first_name: "J.", last_name: "Johnson", position_abbreviation: "CB", team: "CHI", jersey_number: "33", headshotUrl: null },
    FS:  { id: 302, first_name: "K.", last_name: "Byard", position_abbreviation: "FS", team: "CHI", jersey_number: "31", headshotUrl: null },
    SS:  { id: 303, first_name: "J.", last_name: "Brisker", position_abbreviation: "SS", team: "CHI", jersey_number: "9", headshotUrl: null },
    CB2: { id: 304, first_name: "T.", last_name: "Stevenson", position_abbreviation: "CB", team: "CHI", jersey_number: "29", headshotUrl: null },

    OLB: { id: 305, first_name: "T.", last_name: "Edwards", position_abbreviation: "LB", team: "CHI", jersey_number: "53", headshotUrl: null },
    MLB: { id: 306, first_name: "T.", last_name: "Edmunds", position_abbreviation: "LB", team: "CHI", jersey_number: "49", headshotUrl: null },
    ILB: { id: 307, first_name: "S.", last_name: "Sanborn", position_abbreviation: "LB", team: "CHI", jersey_number: "57", headshotUrl: null },

    DE1: { id: 308, first_name: "M.", last_name: "Sweat", position_abbreviation: "DE", team: "CHI", jersey_number: "98", headshotUrl: null },
    DT1: { id: 309, first_name: "A.", last_name: "Billings", position_abbreviation: "DT", team: "CHI", jersey_number: "97", headshotUrl: null },
    DT2: { id: 310, first_name: "G.", last_name: "Dexter", position_abbreviation: "DT", team: "CHI", jersey_number: "99", headshotUrl: null },
    DE2: { id: 311, first_name: "D.", last_name: "Walker", position_abbreviation: "DE", team: "CHI", jersey_number: "95", headshotUrl: null },
  },

  specialTeams: {
    K:  { id: 401, first_name: "C.", last_name: "Santos", position_abbreviation: "K",  team: "CHI", jersey_number: "7", headshotUrl: null },
    P:  { id: 402, first_name: "T.", last_name: "Gill", position_abbreviation: "P",  team: "CHI", jersey_number: "16", headshotUrl: null },
    LS: { id: 403, first_name: "P.", last_name: "Scales", position_abbreviation: "LS", team: "CHI", jersey_number: "48", headshotUrl: null },
    KR: { id: 404, first_name: "V.", last_name: "Jones", position_abbreviation: "KR", team: "CHI", jersey_number: "12", headshotUrl: null },
    PR: { id: 405, first_name: "T.", last_name: "Scott", position_abbreviation: "PR", team: "CHI", jersey_number: "10", headshotUrl: null },
  },
};
