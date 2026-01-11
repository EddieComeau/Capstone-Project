/* -------------------------------------------------------------------------- */
/*                                 INJURIES                                   */
/* -------------------------------------------------------------------------- */

async function syncInjuries({
  season,
  week,
  per_page = 100,
} = {}) {
  if (!season || !week) {
    throw new Error("syncInjuries requires season and week");
  }

  console.log(`🔁 syncInjuries starting — season ${season}, week ${week}`);

  let cursor = null;
  let page = 1;
  let totalFetched = 0;
  let bulkOps = [];

  while (true) {
    console.log(
      `📄 Fetching injuries page ${page} params:`,
      JSON.stringify({ season, week, per_page, cursor })
    );

    const injuriesPage = await sportsdata.getPlayerInjuries({
      season,
      week,
      per_page,
      cursor,
    });

    if (!injuriesPage || !injuriesPage.data?.length) {
      console.log("   Received 0 injuries");
      break;
    }

    const injuries = injuriesPage.data;
    const meta = injuriesPage.meta || {};

    for (const inj of injuries) {
      if (!inj?.player?.id) continue;

      bulkOps.push({
        updateOne: {
          filter: {
            "player.id": inj.player.id,
            date: inj.date ? new Date(inj.date) : null,
          },
          update: {
            $set: {
              player: inj.player,
              status: inj.status || null,
              comment: inj.comment || null,
              date: inj.date ? new Date(inj.date) : null,
              raw: inj,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        await flushBulkOps(bulkOps, Injury);
      }
    }

    await flushBulkOps(bulkOps, Injury);

    totalFetched += injuries.length;

    if (!meta.next_cursor) {
      console.log("   Next cursor: null (last page)");
      break;
    }

    cursor = meta.next_cursor;
    page++;
  }

  console.log(
    `✅ syncInjuries complete — fetched: ${totalFetched}, pages: ${page}`
  );
}
