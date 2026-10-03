-- U-DOSA のテストデータを消す(メモが「[テスト]」で始まる記録だけ。本物の記録は残る)
delete from public.poop_events where note like '[テスト]%';
