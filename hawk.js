/* The hawk's feed (6 Nov 2026) - admin only. One component for the Charts tab (app.html mounts it for the admin's account alone) and
   for hawk.html (where the phone push opens). Nestor: "when the hawk gives me the load down before the session can it display it also
   in a chart so i have visuals of the hawks understanding plus the explanation so i can slowly train it to think like me".
   Each alert carries what the hawk looked at (data.chart, from cloud/hawk/hawk.py): ~a day of 5-minute candles, the range it measured,
   premium / discount / 50%, the hour swings behind the phase, the leg, and any entry / stop / target. The chart draws that reading;
   "Correct the read" / "Mark my trade" lets him drag the lines to where HE would draw them and pick the phase - saved in
   hawk_signals.mine, next to the hawk's own reading, which is what the rules get tuned against. Rows are readable by st_is_admin() only.
   Colours come from --hk-* tokens set by the host page. */
(function () {
  if (window.STHawk) return;
  var CSS = [
    '.hk{font-family:var(--hk-font,inherit);color:var(--hk-ink)}',
    '.hk-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}',
    '.hk-eye{font:500 9px var(--hk-mono);letter-spacing:.2em;text-transform:uppercase;color:var(--hk-mut);display:flex;align-items:center;gap:8px}',
    '.hk-eye i{font-style:normal;color:var(--hk-acc);border:1px solid var(--hk-line);border-radius:999px;padding:1px 7px;letter-spacing:.14em}',
    '.hk-title{font-size:28px;font-weight:600;letter-spacing:-.01em;margin:6px 0 2px}',
    '.hk-app .hk-title{display:none}',
    '.hk-sub{color:var(--hk-mut);font-size:13px;margin:4px 0 0}',
    '.hk-tabs{display:flex;gap:6px}',
    '.hk-tabs button{font:500 12px var(--hk-font,inherit);color:var(--hk-mut);background:transparent;border:1px solid var(--hk-line);border-radius:999px;padding:5px 12px;cursor:pointer}',
    '.hk-tabs button[aria-pressed="true"]{color:var(--hk-ink);border-color:var(--hk-ink)}',
    '.hk-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0 4px}',
    '.hk-stats[hidden]{display:none}',
    '.hk-stat{background:var(--hk-card);border:1px solid var(--hk-line);border-radius:10px;padding:10px 12px}',
    '.hk-stat b{display:block;font:500 19px var(--hk-mono);font-variant-numeric:tabular-nums}',
    '.hk-stat span{font-size:12px;color:var(--hk-mut)}',
    '@media (max-width:520px){.hk-stats{grid-template-columns:repeat(2,1fr)}}',
    '.hk-day{font:500 11px var(--hk-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--hk-mut);margin:22px 0 4px}',
    '.hk-card{background:var(--hk-card);border:1px solid var(--hk-line);border-radius:12px;padding:14px 16px;margin-top:10px;scroll-margin-top:20px}',
    '.hk-card.hk-focus{box-shadow:0 0 0 2px var(--hk-acc)}',
    '.hk-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.hk-chip{font:500 10px var(--hk-mono);letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:2px 8px;background:var(--hk-soft);color:var(--hk-mut)}',
    '.hk-chip.buy{color:var(--hk-buy);background:color-mix(in srgb,var(--hk-buy) 14%,transparent)}',
    '.hk-chip.sell{color:var(--hk-sell);background:color-mix(in srgb,var(--hk-sell) 14%,transparent)}',
    '.hk-chip.setup{color:var(--hk-acc);background:color-mix(in srgb,var(--hk-acc) 15%,transparent)}',
    '.hk-time{margin-left:auto;font:12px var(--hk-mono);color:var(--hk-mut)}',
    '.hk-card h3{font-size:16px;font-weight:600;margin:8px 0 2px;color:var(--hk-ink)}',
    '.hk-card p{margin:0;line-height:1.5;color:var(--hk-ink)}',
    '.hk-chart{position:relative;height:300px;margin:14px 0 0;border-radius:8px;background:var(--hk-plot);border:1px solid var(--hk-line);overflow:hidden;touch-action:pan-y}',
    '.hk-card.hk-brief .hk-chart{height:340px}',
    '@media (max-width:560px){.hk-chart,.hk-card.hk-brief .hk-chart{height:250px}}',
    '.hk-chart canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.hk-chart.hk-editing{touch-action:none;cursor:ns-resize;box-shadow:0 0 0 1px var(--hk-you)}',
    '.hk-legend{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:12px;color:var(--hk-mut)}',
    '.hk-legend span{display:inline-flex;align-items:center;gap:6px}',
    '.hk-legend s{display:inline-block;width:14px;height:8px;border-radius:2px;text-decoration:none}',
    '.hk-train{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}',
    '.hk-btn{font:500 13px var(--hk-font,inherit);background:var(--hk-soft);color:var(--hk-ink);border:1px solid transparent;border-radius:8px;padding:6px 11px;cursor:pointer}',
    '.hk-btn:hover{border-color:var(--hk-line)}',
    '.hk-btn.you{color:var(--hk-you);background:color-mix(in srgb,var(--hk-you) 13%,transparent)}',
    '.hk-btn.go{color:var(--hk-card);background:var(--hk-you)}',
    '.hk-mine{font-size:13px;color:var(--hk-you)}',
    '.hk-edit{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--hk-you) 7%,transparent);border:1px solid color-mix(in srgb,var(--hk-you) 35%,transparent)}',
    '.hk-edit[hidden]{display:none}',
    '.hk-edit p{font-size:13px;color:var(--hk-mut)}',
    '.hk-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
    '.hk-ph[aria-pressed="true"]{color:var(--hk-you);border-color:var(--hk-you);background:color-mix(in srgb,var(--hk-you) 13%,transparent)}',
    '.hk-rate{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}',
    '.hk-rate .hk-btn[aria-pressed="true"].good{background:color-mix(in srgb,var(--hk-buy) 18%,transparent);border-color:var(--hk-buy);color:var(--hk-buy)}',
    '.hk-rate .hk-btn[aria-pressed="true"].bad{background:color-mix(in srgb,var(--hk-sell) 16%,transparent);border-color:var(--hk-sell);color:var(--hk-sell)}',
    '.hk-rate .hk-btn[aria-pressed="true"].early,.hk-rate .hk-btn[aria-pressed="true"].late{background:color-mix(in srgb,var(--hk-warn) 16%,transparent);border-color:var(--hk-warn);color:var(--hk-warn)}',
    '.hk textarea{width:100%;margin-top:8px;font:14px var(--hk-font,inherit);color:var(--hk-ink);background:var(--hk-plot);border:1px solid var(--hk-line);border-radius:8px;padding:8px 10px;resize:vertical;min-height:38px}',
    '.hk-saved{font-size:12px;color:var(--hk-mut);margin-top:4px;min-height:18px}',
    '.hk button:focus-visible,.hk textarea:focus-visible{outline:2px solid var(--hk-acc);outline-offset:2px}',
    '.hk-empty{color:var(--hk-mut);margin-top:22px}',
    /* the study: the 1-year rule test, trade by trade, each one opened on Replay; his tick / cross, notes and drawings on each */
    '.hk-sh{margin:14px 0 0}.hk-sh h4{margin:0;font-size:15px;font-weight:600;letter-spacing:-.005em;color:var(--hk-ink)}.hk-sh p{margin:3px 0 0;font:11px var(--hk-mono);color:var(--hk-mut);letter-spacing:.02em}',
    '.hk-kpi{display:grid;grid-template-columns:repeat(4,1fr);margin:12px 0 0;border:1px solid var(--hk-line);border-radius:8px;overflow:hidden}',
    '.hk-kpi div{padding:8px 10px;border-left:1px solid var(--hk-line);min-width:0}.hk-kpi div:first-child{border-left:0}',
    '.hk-kpi b{display:block;font:500 15px var(--hk-mono);font-variant-numeric:tabular-nums;color:var(--hk-ink);white-space:nowrap}.hk-kpi b.up{color:var(--hk-buy)}.hk-kpi b.dn{color:var(--hk-sell)}',
    '.hk-kpi span{display:block;margin-top:2px;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--hk-mut);white-space:nowrap}',
    '.hk-prog{margin:12px 0 0}.hk-prog .t{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--hk-mut)}.hk-prog .t b{font-weight:500;color:var(--hk-ink)}',
    '.hk-bar{display:flex;height:4px;border-radius:2px;background:var(--hk-soft);overflow:hidden;margin-top:6px}.hk-bar i{display:block;height:100%}.hk-bar i.ok{background:var(--hk-buy)}.hk-bar i.no{background:var(--hk-sell)}',
    '.hk-seg{display:flex;margin:12px 0 0;padding:2px;border-radius:7px;background:var(--hk-soft)}',
    '.hk-seg button{flex:1 1 auto;font:500 11px var(--hk-font,inherit);color:var(--hk-mut);background:transparent;border:0;border-radius:5px;padding:5px 4px;cursor:pointer;white-space:nowrap}',
    '.hk-seg button:hover{color:var(--hk-ink)}.hk-seg button[aria-pressed="true"]{background:var(--hk-card);color:var(--hk-ink);box-shadow:0 1px 2px rgba(0,0,0,.2)}',
    '.hk-mo{position:sticky;top:0;z-index:2;display:flex;align-items:baseline;gap:8px;padding:14px 4px 6px;background:var(--hk-bg,var(--hk-plot));font:500 10.5px var(--hk-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--hk-mut);border-bottom:1px solid var(--hk-line)}',
    '.hk-mo em{font-style:normal;letter-spacing:.02em;text-transform:none}.hk-mo b{margin-left:auto;font-weight:500;letter-spacing:0;font-variant-numeric:tabular-nums}.hk-mo b.up{color:var(--hk-buy)}.hk-mo b.dn{color:var(--hk-sell)}',
    '.hk-tr{display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--hk-line);padding:3px 0}',
    '.hk-trm{flex:1 1 auto;min-width:0;display:grid;grid-template-columns:1fr auto;column-gap:10px;row-gap:3px;align-items:baseline;text-align:left;background:transparent;border:0;border-radius:6px;padding:6px;cursor:pointer;color:var(--hk-ink);font:inherit}',
    '.hk-trm:hover,.hk-tr[aria-current="true"] .hk-trm{background:var(--hk-soft)}',
    '.hk-trm .m{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.hk-trm .m i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:8px;vertical-align:1px;background:var(--hk-buy)}.hk-trm .m i.sell{background:var(--hk-sell)}',
    '.hk-trm .r{font:500 12.5px var(--hk-mono);font-variant-numeric:tabular-nums;color:var(--hk-mut);text-align:right}.hk-trm .r.win{color:var(--hk-buy)}.hk-trm .r.loss{color:var(--hk-sell)}',
    '.hk-trm .s{grid-column:1/-1;font:11px var(--hk-mono);color:var(--hk-mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:15px}.hk-trm .s u{text-decoration:none;color:var(--hk-you)}',
    '.hk-vt{display:flex;gap:4px;flex:none;padding-right:2px}.hk-tr[aria-current="true"] .hk-vt{display:none}',
    '.hk-vt button,.hk-vb button{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--hk-line);background:transparent;color:var(--hk-mut);cursor:pointer}',
    '.hk-vt button{width:26px;height:26px;padding:0;border-radius:6px}.hk-vt svg{width:14px;height:14px}',
    '.hk-vt button:hover,.hk-vb button:hover{color:var(--hk-ink);border-color:var(--hk-mut)}',
    '[data-tick="agree"][aria-pressed="true"]{color:var(--hk-buy)!important;border-color:var(--hk-buy)!important;background:color-mix(in srgb,var(--hk-buy) 16%,transparent)!important}',
    '[data-tick="disagree"][aria-pressed="true"]{color:var(--hk-sell)!important;border-color:var(--hk-sell)!important;background:color-mix(in srgb,var(--hk-sell) 16%,transparent)!important}',
    '.hk-det{margin:4px 0 12px;padding:12px 12px 14px;border-radius:10px;background:var(--hk-card);border:1px solid var(--hk-line)}',
    '.hk-dh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.hk-out{font:500 10px var(--hk-mono);letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:var(--hk-soft);color:var(--hk-mut)}.hk-out.win{color:var(--hk-buy);background:color-mix(in srgb,var(--hk-buy) 14%,transparent)}.hk-out.loss{color:var(--hk-sell);background:color-mix(in srgb,var(--hk-sell) 14%,transparent)}',
    '.hk-dh .rr{font:500 13px var(--hk-mono);font-variant-numeric:tabular-nums;color:var(--hk-ink)}.hk-dh .rr small{font-size:11px;color:var(--hk-mut);margin-left:4px}.hk-dh .n{margin-left:auto;font:11px var(--hk-mono);color:var(--hk-mut)}',
    '.hk-nav{display:grid;grid-template-columns:auto 1fr auto;gap:6px;margin-top:12px}.hk-nav .hk-btn{background:var(--hk-soft);white-space:nowrap}.hk-nav [data-sa="prev"],.hk-nav [data-sa="next"]{min-width:36px;padding:0 10px;font-size:18px;line-height:1}.hk-nav .hk-btn.go{background:var(--hk-acc);color:#fff;font-weight:600}',
    '.hk-sst{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--hk-mut);margin-top:7px;min-height:16px}.hk-sst button{background:none;border:0;padding:0;font:inherit;color:var(--hk-mut);text-decoration:underline;text-underline-offset:2px;cursor:pointer;white-space:nowrap}',
    '.hk-lbl{margin:16px 0 7px;font:500 10px var(--hk-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--hk-mut)}',
    '.hk-why{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}',
    '.hk-why li{position:relative;padding-left:14px;font-size:12.5px;line-height:1.5;color:var(--hk-ink)}.hk-why li::before{content:"";position:absolute;left:2px;top:.6em;width:5px;height:5px;border-radius:50%;background:var(--hk-mut);opacity:.6}.hk-why li b{font-weight:600}',
    '.hk-vb{display:grid;grid-template-columns:1fr 1fr;gap:6px}.hk-vb button{gap:7px;height:36px;border-radius:8px;color:var(--hk-ink);font:500 13px var(--hk-font,inherit)}.hk-vb svg{width:15px;height:15px}',
    '.hk-det textarea{margin-top:8px;min-height:64px;background:var(--hk-plot)}',
    '.hk-dw{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--hk-ink)}.hk-dw span{color:var(--hk-mut)}.hk-dw .hk-btn{flex:none;background:var(--hk-soft)}',
    '.hk-hint{font-size:11.5px;color:var(--hk-mut);margin:6px 0 0;line-height:1.45}',
    '.hk-per{margin-top:12px}.hk-per .hk-seg{margin:0}.hk-pr{margin-top:6px;font:11px var(--hk-mono);color:var(--hk-mut);font-variant-numeric:tabular-nums}',
    '.hk-dates{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;margin-top:8px}.hk-dates span{font-size:11px;color:var(--hk-mut)}',
    '.hk-dates input{min-width:0;height:30px;box-sizing:border-box;padding:0 8px;border-radius:7px;border:1px solid var(--hk-line);background:var(--hk-soft);color:var(--hk-ink);font:500 12px var(--hk-mono);color-scheme:light dark}',
    '.hk-sh{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.hk-vw{margin:0;flex:none}.hk-vw button{padding:4px 9px}.hk-lead{margin:10px 0 0}',
    '.hk-vb button span{white-space:nowrap}.hk-saved:empty{display:none}.hk-det .hk-saved{margin-top:8px;font-size:11.5px;color:var(--hk-mut)}',
    '.hk-kpi.c3{grid-template-columns:repeat(3,1fr);margin:0}.hk-kpi.c3 b{font-size:12.5px}',
    '.hk-tt dd.p.mb{color:var(--hk-you)}.hk-bb{display:flex;gap:6px;flex:none}.hk-dw span b{font:500 12px var(--hk-mono);color:var(--hk-you)}',
    '.hk-tt{display:grid;grid-template-columns:auto 1fr auto;column-gap:0;margin:0;padding:2px 10px;border:1px solid var(--hk-line);border-radius:8px}',
    '.hk-tt>*{margin:0;padding:7px 0;border-top:1px solid var(--hk-line);font-size:12px;line-height:1.3}.hk-tt>:nth-child(-n+3){border-top:0}',
    '.hk-tt dt{color:var(--hk-mut)}.hk-tt dd.p{font:500 12.5px var(--hk-mono);font-variant-numeric:tabular-nums;color:var(--hk-ink)}.hk-tt dd.p.sl{color:var(--hk-sell)}.hk-tt dd.p.tp{color:var(--hk-buy)}.hk-tt dd{padding-left:12px}.hk-tt dd.x{text-align:right;font-size:11.5px;color:var(--hk-mut)}',
    '.hk-wtop{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:10px;font-size:11.5px;line-height:1.45;color:var(--hk-mut)}.hk-wtop button{flex:none;background:none;border:0;padding:0;font:500 11.5px var(--hk-font,inherit);color:var(--hk-acc);cursor:pointer}',
    '.hk-wc{display:flex;flex-direction:column;gap:14px;margin-top:14px}',
    '.hk-wr .h{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px}.hk-wr .h>span{font-size:12.5px;font-weight:500;color:var(--hk-ink)}',
    '.hk-wr .hk-seg{margin:0;flex:none}.hk-wr .hk-seg button{padding:3px 9px;font-size:10.5px}.hk-wr .note{margin-top:5px;font-size:11px;line-height:1.4;color:var(--hk-mut)}',
    '.hk-stp{display:grid;grid-template-columns:30px 1fr 30px;align-items:center;gap:6px;margin-top:7px}',
    '.hk-stp button{height:30px;border-radius:7px;border:1px solid var(--hk-line);background:transparent;color:var(--hk-ink);font:500 15px var(--hk-mono);cursor:pointer;padding:0}.hk-stp button:hover{border-color:var(--hk-mut)}',
    '.hk-stp label{display:flex;align-items:center;justify-content:center;gap:6px;height:30px;border-radius:7px;background:var(--hk-soft);padding:0 8px;font-size:11px;color:var(--hk-mut);white-space:nowrap;overflow:hidden;cursor:text}',
    '.hk-stp input{width:4.4em;background:transparent;border:0;outline:0;text-align:right;font:500 13.5px var(--hk-mono);font-variant-numeric:tabular-nums;color:var(--hk-ink);padding:0;margin:0;min-height:0;-moz-appearance:textfield;appearance:textfield}',
    '.hk-stp input[type="time"]{width:4.6em;color-scheme:light dark}.hk-stp input::-webkit-calendar-picker-indicator{display:none}',
    '.hk-stp input::-webkit-inner-spin-button,.hk-stp input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.hk-stp label:focus-within{box-shadow:inset 0 0 0 1px var(--hk-acc)}',
    '.hk-cmp{margin-top:8px;font-size:12px;color:var(--hk-mut)}.hk-cmp b{font-weight:500;font-variant-numeric:tabular-nums}.hk-cmp b.up{color:var(--hk-buy)}.hk-cmp b.dn{color:var(--hk-sell)}',
    '.hk-kpi.sm{margin-top:8px}.hk-kpi.sm b{font-size:13px}',
    '.hk-eq{display:block;width:100%;height:96px;margin-top:12px}.hk-eq path{fill:none;stroke-width:1.6;vector-effect:non-scaling-stroke;stroke-linejoin:round}.hk-eq .a{stroke:var(--hk-acc)}.hk-eq .b{stroke:var(--hk-mut);stroke-dasharray:3 3;opacity:.75}.hk-eq line{stroke:var(--hk-line);vector-effect:non-scaling-stroke}',
    '.hk-leg{display:flex;gap:14px;font-size:10.5px;color:var(--hk-mut);margin-top:4px}.hk-leg i{display:inline-block;width:14px;height:0;border-top:2px solid var(--hk-acc);vertical-align:3px;margin-right:5px}.hk-leg i.b{border-top:2px dashed var(--hk-mut)}',
    '.hk-hm{overflow-x:auto}.hk-hm .ax{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--hk-mut);margin:0 0 4px}',
    '.hk-hm table{width:100%;min-width:270px;border-collapse:separate;border-spacing:2px;table-layout:fixed;font:500 10.5px var(--hk-mono);font-variant-numeric:tabular-nums}',
    '.hk-hm th{font-weight:500;color:var(--hk-mut);padding:3px 0;text-align:center;white-space:nowrap}.hk-hm th.y{width:44px;text-align:right;padding-right:5px}.hk-hm td{padding:0}',
    '.hk-hm td button{position:relative;display:block;width:100%;height:26px;border:0;border-radius:4px;color:var(--hk-ink);font:inherit;cursor:pointer;padding:0}',
    '.hk-hm td button:hover{box-shadow:inset 0 0 0 1px var(--hk-mut)}.hk-hm td button[aria-current="true"]{box-shadow:inset 0 0 0 1.5px var(--hk-ink)}',
    '.hk-hm td button.base::after{content:"";position:absolute;top:3px;right:3px;width:4px;height:4px;border-radius:50%;background:var(--hk-ink);opacity:.7}',
    /* narrow: the Live Charts rail panel */
    '.hk-nar{font-size:13px}.hk-nar .hk-sub{display:none}.hk-nar .hk-head{align-items:center}.hk-nar .hk-tabs button{padding:3px 9px;font-size:11px}',
    '.hk-today{margin:12px 0 2px;padding:10px 12px 4px;border:1px solid var(--hk-line);border-radius:8px}.hk-tdh{display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:11.5px;color:var(--hk-mut)}.hk-tdh span:first-child{font-weight:600;color:var(--hk-ink)}',
    '.hk-nar .hk-stats{grid-template-columns:repeat(4,1fr);gap:4px;margin:10px 0 0}.hk-nar .hk-stat{padding:6px 8px;border-radius:6px}.hk-nar .hk-stat b{font-size:14px}.hk-nar .hk-stat span{font-size:10px}',
    '.hk-nar .hk-day{margin:14px 0 2px}.hk-nar .hk-card{padding:10px 11px;border-radius:8px;margin-top:8px}.hk-nar .hk-card h3{font-size:13.5px;margin:6px 0 2px}.hk-nar .hk-card p{font-size:12.5px}',
    '.hk-nar .hk-chart,.hk-nar .hk-card.hk-brief .hk-chart{height:220px;margin-top:10px}.hk-nar .hk-legend{font-size:11px;gap:2px 10px}.hk-nar .hk-btn{font-size:12px;padding:5px 8px}.hk-nar textarea{font-size:12.5px}'
  ].join('\n');
  var RATE = [['good', 'Good call'], ['bad', 'Not my trade'], ['early', 'Too early'], ['late', 'Too late']];
  var KIND = { brief: 'Brief', sweep: 'Watch', pocket: 'Watch', initiation: 'Initiation', setup: 'Setup', done: 'Done' };
  var PHASES = [['range', 'Range'], ['trend up', 'Trend up'], ['trend down', 'Trend down']];
  var LDN = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ldn(iso, o) { return new Date(iso).toLocaleString('en-GB', Object.assign({ timeZone: 'Europe/London' }, o)); }
  function p5(v) { return (+v).toFixed(5); }
  function r5(v) { return Math.round(v * 1e5) / 1e5; }
  function css(doc) { var s = doc.getElementById('hk-css'); if (s) { if (s.textContent !== CSS) s.textContent = CSS; return; } s = doc.createElement('style'); s.id = 'hk-css'; s.textContent = CSS; doc.head.appendChild(s); }   // in the document it shows in (Live Charts' own window too); a copy left by an older hawk.js in a window that outlived an app reload is replaced

  // ---------- the chart: what the hawk saw, and what it made of it
  function agg(src, sec) {
    var out = [];
    src.forEach(function (b) { var k = Math.floor(b[0] / sec) * sec, l = out[out.length - 1];
      if (l && l[0] === k) { l[2] = Math.max(l[2], b[2]); l[3] = Math.min(l[3], b[3]); l[4] = b[4]; } else out.push([k, b[1], b[2], b[3], b[4]]); });
    return out;
  }
  function editKeys(r) { return r.kind === 'brief' ? ['bh', 'bl'] : r.data && r.data.entry != null && r.data.stop != null && r.data.tgt != null ? ['entry', 'stop', 'tgt'] : []; }
  var NAMES = { bh: 'Your high', bl: 'Your low', entry: 'Your entry', stop: 'Your stop', tgt: 'Your target' };

  function draw(st) {
    var box = st.box, cv = st.cv, W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return;
    var dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var cs = getComputedStyle(box), K = {};
    ['ink', 'mut', 'line', 'soft', 'acc', 'buy', 'sell', 'warn', 'you', 'cup', 'cdn', 'card', 'plot'].forEach(function (n) { K[n] = cs.getPropertyValue('--hk-' + n).trim() || '#888'; });
    var MONO = cs.getPropertyValue('--hk-mono').trim() || 'monospace';
    var r = st.row, a = r.data || {}, d = a.chart;
    var RG = W < 480 ? 60 : 70, TOP = 10, BOT = 20, PW = W - RG, PH = H - TOP - BOT;
    // fewer, wider candles when the chart is narrow
    // the brief shows the whole day it measured; an alert zooms in on the session, so a 3-pip stop can be seen
    var tf = d.tf * 60, src = d.c;
    if (r.kind !== 'brief') { var t0 = Math.max(d.r0, d.w0 - 3 * 3600); src = d.c.filter(function (b) { return b[0] >= t0; }); if (src.length < 36) src = d.c.slice(-36); }
    var bars = src;
    if (PW / (src.length * 1.16) < 2.8) { if (!st.c15) st.c15 = agg(src, 900); bars = st.c15; tf = 900; }
    var n = bars.length; if (!n) return;
    var fut = Math.max(8, Math.round(n * 0.16)), bw = PW / (n + fut);
    function xt(t) {   // a time on the bar scale (gaps closed up)
      if (t <= bars[0][0]) return 0;
      var lo = 0, hi = n - 1; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (bars[m][0] <= t) lo = m; else hi = m - 1; }
      return Math.min(PW, (lo + Math.min(t - bars[lo][0], lo === n - 1 ? 1e9 : tf) / tf) * bw);
    }
    var mine = st.edit || r.mine || null, keys = editKeys(r);
    var lv = [];
    bars.forEach(function (b) { lv.push(b[2], b[3]); });
    var bh0 = Math.max.apply(null, lv), bl0 = Math.min.apply(null, lv), near = (bh0 - bl0) * 0.6;
    [d.bh, d.bl].forEach(function (v) { if (r.kind === 'brief' || (v < bh0 + near && v > bl0 - near)) lv.push(v); });
    ['entry', 'stop', 'tgt', 'A'].forEach(function (k) { if (a[k] != null) lv.push(+a[k]); });
    if (mine) keys.forEach(function (k) { if (mine[k] != null) lv.push(+mine[k]); });
    var hi = Math.max.apply(null, lv), lo = Math.min.apply(null, lv), pad = (hi - lo) * 0.06 || 0.0005;
    hi += pad; lo -= pad;
    if (st.frozen) { hi = st.frozen[0]; lo = st.frozen[1]; } else st.scale = [hi, lo];
    st.y = function (p) { return TOP + (hi - p) / (hi - lo) * PH; };
    st.p = function (y) { return hi - (y - TOP) / PH * (hi - lo); };
    var Y = st.y;
    st.PW = PW;
    function line(y, col, w, dash, x0, x1) { g.save(); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.moveTo(x0 || 0, Math.round(y) + .5); g.lineTo(x1 == null ? PW : x1, Math.round(y) + .5); g.stroke(); g.restore(); }
    function tint(col, al) { g.globalAlpha = al; g.fillStyle = col; }
    function txt(s, x, y, col, al, size, w) { g.font = (w || 500) + ' ' + (size || 9) + 'px ' + MONO; g.fillStyle = col; g.textAlign = al || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y); }
    var pills = [];
    function pill(p, text, bg, fg) { pills.push({ y: Y(p), t: text, bg: bg, fg: fg || K.card }); }
    function tag(p, s, col, x) { txt(s, x == null ? PW - 6 : x, Y(p) - 7, col, 'right', 9); }

    g.save(); g.beginPath(); g.rect(0, 0, PW, H); g.clip();   // nothing spills into the price column
    // London hours along the bottom, faint grid
    if (!st.hm || st.hmFor !== bars) { st.hmFor = bars; st.hm = bars.map(function (b) { return LDN.format(new Date(b[0] * 1000)); }); }
    var step = [1, 2, 3, 4, 6].find(function (s) { return 3600 * s / tf * bw >= 58; }) || 6;
    for (var i = 0; i < n; i++) { var hm = st.hm[i];
      if (hm.slice(3) === '00' && (+hm.slice(0, 2)) % step === 0) { var x = i * bw;
        g.fillStyle = K.line; g.fillRect(Math.round(x), TOP, 1, PH); txt(hm, x, H - 9, K.mut, 'center', 9); } }
    // the London window, 08:00-10:00
    var w0 = xt(d.w0), w1 = d.w1 > bars[n - 1][0] + tf ? PW : xt(d.w1);
    if (w1 > w0) { tint(K.soft, 0.9); g.fillRect(w0, TOP, w1 - w0, PH); g.globalAlpha = 1; if (w1 - w0 > 84) txt('LONDON 08–10', w0 + 6, TOP + PH - 8, K.mut, 'left', 9); }
    // the range it measured: premium (top 25%), discount (bottom 25%), the 50%
    var xr = xt(d.r0), q = (d.bh - d.bl) / 4, mid = (d.bh + d.bl) / 2, ranged = d.phase === 'range';
    tint(K.sell, ranged ? 0.13 : 0.07); g.fillRect(xr, Y(d.bh), PW - xr, Y(d.bh - q) - Y(d.bh));
    tint(K.buy, ranged ? 0.13 : 0.07); g.fillRect(xr, Y(d.bl + q), PW - xr, Y(d.bl) - Y(d.bl + q)); g.globalAlpha = 1;
    line(Y(d.bh), K.mut, 1, null, xr); line(Y(d.bl), K.mut, 1, null, xr); line(Y(mid), K.mut, 1, [4, 4], xr);
    // zone names go where the candles aren't: over the window band at the right, else at the left
    var zx = w1 > w0 && w1 - w0 > 70 ? w0 + 6 : xr + 6;
    if (Y(d.bh - q) - Y(d.bh) > 14) txt('PREMIUM', zx, Y(d.bh - q) - 8, K.sell, 'left', 9, 600);
    if (Y(d.bl) - Y(d.bl + q) > 14) txt('DISCOUNT', zx, Y(d.bl + q) + 9, K.buy, 'left', 9, 600);
    tag(d.bh, 'Range high', K.mut); tag(d.bl, 'Range low', K.mut); tag(mid, '50%', K.mut);
    pill(d.bh, p5(d.bh), K.mut); pill(d.bl, p5(d.bl), K.mut);
    if (d.a2b) { var m2 = (d.a2b[0] + d.a2b[1]) / 2; line(Y(m2), K.acc, 1.2, [6, 4]); tag(m2, 'Leg 50%', K.acc); pill(m2, p5(m2), K.acc); }
    // candles
    var cw = Math.max(1, Math.min(9, bw * 0.62));
    bars.forEach(function (b, i) { var x = (i + 0.5) * bw, up = b[4] >= b[1]; g.fillStyle = up ? K.cup : K.cdn;
      g.fillRect(Math.round(x - 0.5), Y(b[2]), 1, Math.max(1, Y(b[3]) - Y(b[2])));
      var y0 = Y(Math.max(b[1], b[4])), y1 = Y(Math.min(b[1], b[4])); g.fillRect(Math.round(x - cw / 2), y0, Math.max(1, Math.round(cw)), Math.max(1, y1 - y0)); });
    // the hour swings behind the phase: higher highs / lows
    var lastH = null, lastL = null;
    (d.sw || []).forEach(function (s) { var x = xt(s[0] + 1800), isH = s[2] === 'H', prev = isH ? lastH : lastL;
      var lab = prev == null ? s[2] : isH ? (s[1] > prev ? 'HH' : 'LH') : (s[1] > prev ? 'HL' : 'LL');
      if (isH) lastH = s[1]; else lastL = s[1];
      if (x <= 0) return;
      g.fillStyle = K.ink; g.beginPath(); g.arc(x, Y(s[1]) + (isH ? -4 : 4), 2, 0, 7); g.fill();
      txt(lab, x, Y(s[1]) + (isH ? -13 : 13), K.ink, 'center', 9, 600); });
    // what the alert is about
    if (r.kind === 'sweep' && a.A != null) { var xs = xt(a.ta || d.now);
      line(Y(a.A), K.warn, 1, [2, 3], xs); g.strokeStyle = K.warn; g.lineWidth = 1.5; g.beginPath(); g.arc(xs, Y(a.A), 5, 0, 7); g.stroke();
      tag(a.A, r.side === 1 ? 'Low taken' : 'High taken', K.warn); pill(a.A, p5(a.A), K.warn); }
    if (r.kind === 'initiation' && a.edge != null) { line(Y(a.edge), K.warn, 1, [2, 3]); tag(a.edge, 'Closed beyond', K.warn); }
    if (a.A != null && a.B != null && a.ta && a.tb && r.kind !== 'sweep') {
      g.strokeStyle = K.acc; g.lineWidth = 1.6; g.beginPath(); g.moveTo(xt(a.ta), Y(a.A)); g.lineTo(xt(a.tb), Y(a.B)); g.stroke();
      txt('A', xt(a.ta) - 8, Y(a.A), K.acc, 'center', 10, 600); txt('B', xt(a.tb) + 8, Y(a.B), K.acc, 'center', 10, 600); }
    if (a.entry != null && a.stop != null && a.tgt != null) { var x0 = Math.min(PW - 24, xt(d.now));
      tint(K.buy, 0.16); g.fillRect(x0, Math.min(Y(a.entry), Y(a.tgt)), PW - x0, Math.abs(Y(a.tgt) - Y(a.entry)));
      tint(K.sell, 0.18); g.fillRect(x0, Math.min(Y(a.entry), Y(a.stop)), PW - x0, Math.max(1, Math.abs(Y(a.stop) - Y(a.entry)))); g.globalAlpha = 1;
      line(Y(a.entry), K.ink, 1.2, null, x0); line(Y(a.tgt), K.buy, 1.2, null, x0); line(Y(a.stop), K.sell, 1.2, null, x0);
      tag(a.entry, 'Entry', K.ink); tag(a.tgt, 'Target', K.buy); tag(a.stop, 'Stop', K.sell);
      pill(a.entry, p5(a.entry), K.ink); pill(a.tgt, p5(a.tgt), K.buy); pill(a.stop, p5(a.stop), K.sell); }
    // price when it spoke
    var lb = bars[n - 1], xn = (n - 0.5) * bw;
    line(Y(d.px), K.acc, 1, [1, 3], xn); g.fillStyle = K.acc; g.beginPath(); g.arc(xn, Y(d.px), 3, 0, 7); g.fill(); pill(d.px, p5(d.px), K.acc);
    // his read
    if (mine) keys.forEach(function (k) { if (mine[k] == null) return; var v = +mine[k], same = Math.abs(v - (k === 'bh' || k === 'bl' ? d[k] : a[k])) < 2e-6;
      if (same && !st.edit) return;   // he kept the hawk's level
      line(Y(v), K.you, st.edit ? 2 : 1.5, st.edit ? null : [7, 4]); tag(v, NAMES[k], K.you, PW - 6);
      if (st.edit) { g.fillStyle = K.you; g.beginPath(); g.arc(PW - 14, Y(v), st.drag === k ? 7 : 5.5, 0, 7); g.fill(); }
      pill(v, p5(v), K.you); });
    // hover
    if (st.hover && !st.edit) { var hx = st.hover.x, hy = st.hover.y;
      if (hx < PW && hy > TOP && hy < TOP + PH) {
        g.fillStyle = K.mut; g.globalAlpha = .5; g.fillRect(Math.round(hx), TOP, 1, PH); g.fillRect(0, Math.round(hy), PW, 1); g.globalAlpha = 1;
        pill(st.p(hy), p5(st.p(hy)), K.ink);
        var bi = Math.floor(hx / bw); if (bi >= 0 && bi < n) { var tl = st.hm[bi]; g.font = '500 9px ' + MONO; var tw = g.measureText(tl).width + 10;
          g.fillStyle = K.ink; g.fillRect(hx - tw / 2, H - BOT + 3, tw, 14); txt(tl, hx, H - BOT + 10, K.card, 'center', 9); } } }
    g.restore();
    // price labels in the gutter, kept apart (only those in view)
    pills = pills.filter(function (p) { return p.y > TOP - 4 && p.y < TOP + PH + 4; });
    pills.sort(function (p, q2) { return p.y - q2.y; });
    for (var k = 1; k < pills.length; k++) if (pills[k].y - pills[k - 1].y < 15) pills[k].y = pills[k - 1].y + 15;
    var over = pills.length ? pills[pills.length - 1].y - (H - BOT - 8) : 0;
    if (over > 0) for (k = pills.length - 1; k >= 0; k--) { pills[k].y -= over; if (k && pills[k].y - pills[k - 1].y >= 15) break; }
    g.fillStyle = K.plot; g.fillRect(PW, 0, RG, H); g.fillStyle = K.line; g.fillRect(PW, 0, 1, H);
    pills.forEach(function (p) { g.fillStyle = p.bg; g.beginPath();
      if (g.roundRect) g.roundRect(PW + 4, p.y - 7, RG - 8, 14, 3); else g.rect(PW + 4, p.y - 7, RG - 8, 14); g.fill();
      txt(p.t, PW + RG / 2, p.y + .5, p.fg, 'center', 10, 500); });
  }

  // ---------- the feed
  function mount(host, sb, opt) {
    opt = opt || {}; var doc = host.ownerDocument || document; css(doc);
    var focusId = opt.focusId || null, period = focusId ? 7 : 1, rows = [], charts = {}, pollT = null;
    host.innerHTML = '<div class="hk' + (opt.app ? ' hk-app' : '') + (opt.narrow ? ' hk-nar' : '') + '"><div class="hk-head"><div>' +
      '<div class="hk-eye">Hawk <i>Admin only</i></div><div class="hk-title">Hawk</div>' +
      '<p class="hk-sub">Its read of EUR/USD before and during London 08:00–10:00. Rate each alert, or draw your own read on the chart.</p></div>' +
      '<div class="hk-tabs" role="group" aria-label="Period"><button data-p="1">Today</button><button data-p="7">7 days</button><button data-p="90">All</button><button data-p="s">Study</button></div></div>' +
      '<div class="hk-today" hidden></div><div class="hk-stats" hidden></div><div class="hk-list"><p class="hk-empty">Loading…</p></div></div>';
    var root = host.firstChild, list = root.querySelector('.hk-list'), statsEl = root.querySelector('.hk-stats'), todayEl = root.querySelector('.hk-today');
    // in the app, the Today view opens with the session's plan, news and risk budget (the app's Today panel, moved in here for the admin)
    function todayPaint() { var t = null; if (opt.today && period === 1) { try { t = opt.today(); } catch (x) {} }
      if (!t || !t.html) { if (!todayEl.hidden) { todayEl.hidden = true; todayEl.innerHTML = ''; } return; }
      var h = '<div class="hk-tdh"><span>Session</span><span>' + esc(t.sess || '') + '</span></div>' + t.html;
      if (todayEl.innerHTML !== h) todayEl.innerHTML = h; todayEl.hidden = false; }
    if (opt.today) setInterval(function () { if (!doc.hidden && host.offsetParent) todayPaint(); }, 15000);
    function tabs() { root.querySelectorAll('.hk-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.p === String(period)); }); todayPaint(); }
    tabs();
    function redraw() { Object.keys(charts).forEach(function (id) { draw(charts[id]); }); }   // a hidden chart has no size and draws nothing
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { redraw(); }) : null;
    if (ro) ro.observe(list);
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw); } catch (e) {}
    function byEl(sel) { return root.querySelector(sel); }

    function stats() {
      var al = rows.filter(function (r) { return r.kind !== 'done' && r.kind !== 'brief'; }), rated = al.filter(function (r) { return r.feedback; });
      var good = rated.filter(function (r) { return r.feedback === 'good'; }).length, drawn = rows.filter(function (r) { return r.mine; }).length;
      statsEl.innerHTML = [[al.length, 'alerts'], [rated.length, 'rated'], [rated.length ? Math.round(100 * good / rated.length) + '%' : '–', 'good calls'], [drawn, 'your reads']]
        .map(function (s) { return '<div class="hk-stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('');
      statsEl.hidden = !rows.length;
    }
    function mineText(r) {
      var m = r.mine; if (!m) return '';
      if (r.kind === 'brief') return 'Your read: ' + (PHASES.filter(function (p) { return p[0] === m.phase; }).map(function (p) { return p[1]; })[0] || '') +
        (m.bh != null ? ' · range ' + p5(m.bl) + '–' + p5(m.bh) : '');
      return 'Your trade: entry ' + p5(m.entry) + ' · stop ' + p5(m.stop) + ' · target ' + p5(m.tgt);
    }
    function legend(r) {
      var it = [['sell', 'Premium', .3], ['buy', 'Discount', .3], ['soft', 'London 08–10', 1]];
      if (r.data.chart.a2b) it.push(['acc', 'Leg 50%', 1]);
      if (r.data.entry != null) it.push(['ink', 'Entry · stop · target', 1]);
      it.push(['you', 'You', 1]);
      return '<div class="hk-legend">' + it.map(function (x) { return '<span><s style="background:var(--hk-' + x[0] + ');opacity:' + x[2] + '"></s>' + x[1] + '</span>'; }).join('') +
        '<span>HH · HL · LH · LL = hour swings</span></div>';
    }
    function card(r) {
      var side = r.side === 1 ? '<span class="hk-chip buy">Buy</span>' : r.side === -1 ? '<span class="hk-chip sell">Sell</span>' : '';
      var ch = r.data && r.data.chart && r.data.chart.c && r.data.chart.c.length, keys = editKeys(r), h = '';
      h += '<article class="hk-card' + (r.kind === 'brief' ? ' hk-brief' : '') + (r.id === focusId ? ' hk-focus' : '') + '" id="hk-a-' + r.id + '">' +
        '<div class="hk-top"><span class="hk-chip' + (r.kind === 'setup' ? ' setup' : '') + '">' + esc(KIND[r.kind] || r.kind) + '</span>' + side +
        '<span class="hk-time">' + esc(ldn(r.created_at, { hour: '2-digit', minute: '2-digit' })) + '</span></div>' +
        '<h3>' + esc(r.title) + '</h3><p>' + esc(r.body) + '</p>';
      if (ch) {
        h += '<div class="hk-chart" data-id="' + r.id + '"><canvas role="img" aria-label="The hawk\'s chart for this alert"></canvas></div>' + legend(r);
        if (keys.length) h += '<div class="hk-train"><button class="hk-btn you" data-act="edit" data-id="' + r.id + '">' + (r.kind === 'brief' ? 'Correct the read' : 'Mark my trade') + '</button>' +
          '<span class="hk-mine" id="hk-m-' + r.id + '">' + esc(mineText(r)) + '</span></div>' +
          '<div class="hk-edit" id="hk-e-' + r.id + '" hidden><p>' + (r.kind === 'brief' ? 'Drag the two pink lines to the range you would draw, then pick the phase.' : 'Drag the pink lines to your entry, stop and target.') + '</p>' +
          (r.kind === 'brief' ? '<div class="hk-row">' + PHASES.map(function (p) { return '<button class="hk-btn hk-ph" data-act="ph" data-id="' + r.id + '" data-ph="' + p[0] + '" aria-pressed="false">' + p[1] + '</button>'; }).join('') + '</div>' : '') +
          '<div class="hk-row"><button class="hk-btn go" data-act="save" data-id="' + r.id + '">Save my read</button><button class="hk-btn" data-act="cancel" data-id="' + r.id + '">Cancel</button>' +
          '<button class="hk-btn" data-act="clear" data-id="' + r.id + '">Remove mine</button></div></div>';
      }
      if (r.kind !== 'done') h += '<div class="hk-rate">' + RATE.map(function (x) {
        return '<button class="hk-btn ' + x[0] + '" data-act="rate" data-id="' + r.id + '" data-f="' + x[0] + '" aria-pressed="' + (r.feedback === x[0]) + '">' + x[1] + '</button>'; }).join('') +
        '</div><textarea data-id="' + r.id + '" placeholder="What did you see? (optional)" rows="1">' + esc(r.note || '') + '</textarea><div class="hk-saved" id="hk-s-' + r.id + '"></div>';
      return h + '</article>';
    }
    function render() {
      charts = {};
      if (!rows.length) { list.innerHTML = '<p class="hk-empty">No alerts in this period. The hawk watches weekdays: the brief comes at 07:45 London time, then alerts until 10:05.</p>'; statsEl.hidden = true; return; }
      stats();
      var h = '', last = '';
      rows.forEach(function (r) { var dl = ldn(r.created_at, { weekday: 'long', day: 'numeric', month: 'long' });
        if (dl !== last) { h += '<div class="hk-day">' + esc(dl) + '</div>'; last = dl; } h += card(r); });
      list.innerHTML = h;
      list.querySelectorAll('.hk-chart').forEach(function (box) { var r = byId(box.dataset.id);
        var st = charts[r.id] = { box: box, cv: box.firstChild, row: r };
        draw(st); hookChart(st); });
      if (focusId) { var f = byEl('#hk-a-' + focusId); if (f) f.scrollIntoView({ block: 'start' }); focusId = null; }
    }
    function byId(id) { return rows.find(function (x) { return x.id === id; }); }
    function hookChart(st) {
      var box = st.box;
      function pos(e) { var b = box.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
      box.addEventListener('pointermove', function (e) { var p = pos(e);
        if (st.drag) { st.edit[st.drag] = r5(st.p(p.y)); draw(st); return; }
        if (!st.edit) { st.hover = p; draw(st); } });
      box.addEventListener('pointerleave', function () { if (st.hover) { st.hover = null; draw(st); } });
      box.addEventListener('pointerdown', function (e) { if (!st.edit) return; var p = pos(e), best = null, bd = e.pointerType === 'touch' ? 26 : 14;
        editKeys(st.row).forEach(function (k) { var dd = Math.abs(st.y(st.edit[k]) - p.y); if (dd < bd) { bd = dd; best = k; } });
        if (!best) return; e.preventDefault(); st.drag = best; st.frozen = st.scale; try { box.setPointerCapture(e.pointerId); } catch (x) {} draw(st); });
      function up() { if (!st.drag) return; st.drag = null; st.frozen = null;
        if (st.edit.bh != null && st.edit.bl != null && st.edit.bl > st.edit.bh) { var t = st.edit.bh; st.edit.bh = st.edit.bl; st.edit.bl = t; }
        draw(st); }
      box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    }
    async function load(more) {
      if (period === 's') { if (!more) studyLoad(); return; }
      var s = await sb.auth.getSession();
      if (!s.data || !s.data.session) { list.innerHTML = '<p class="hk-empty">Sign in to Session Terminal in this browser first, then open this page again.</p>'; return; }
      if (mount.admin === undefined) { var ad = await sb.rpc('st_is_admin'); mount.admin = !ad.error && ad.data === true; }
      if (!mount.admin) { list.innerHTML = '<p class="hk-empty">Admin only.</p>'; statsEl.hidden = true; return; }
      var since = new Date(Date.now() - period * 86400000); if (period === 1) since = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) + 'T00:00:00Z');
      if (more && rows.length) since = new Date(new Date(rows[0].created_at).getTime() + 1);
      var q = await sb.from('hawk_signals').select('id, created_at, kind, side, title, body, data, feedback, note, mine')
        .gt('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(period > 7 ? 200 : 300);
      if (q.error) { if (!more) list.innerHTML = '<p class="hk-empty">Couldn\'t load the alerts: ' + esc(q.error.message) + '</p>'; return; }
      var got = q.data || [];
      if (more) { if (!got.length) return; if (Object.keys(charts).some(function (id) { return charts[id].edit; }) || (doc.activeElement && root.contains(doc.activeElement) && doc.activeElement.tagName === 'TEXTAREA')) { pending = got.concat(pending); return; }
        var have = {}; rows.forEach(function (r) { have[r.id] = 1; });
        rows = got.concat(pending).filter(function (r) { return !have[r.id] && (have[r.id] = 1); }).concat(rows); pending = []; } else rows = got;   // never the same alert twice
      render();
    }
    var pending = [];
    // new alerts appear by themselves while the London window is on and this feed is on screen
    function poll() { clearTimeout(pollT); pollT = setTimeout(poll, 30000);
      if (doc.hidden || !host.offsetParent || period !== 1) return;
      var hm = LDN.format(new Date()), m = +hm.slice(0, 2) * 60 + +hm.slice(3), wd = new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short' });
      if (wd === 'Sat' || wd === 'Sun' || m < 7 * 60 + 20 || m > 10 * 60 + 30) return;
      load(true); }
    async function save(id, patch, label) {
      if ('feedback' in patch || 'note' in patch) patch.feedback_at = new Date().toISOString();
      var q = await sb.from('hawk_signals').update(patch).eq('id', id), el = byEl('#hk-s-' + id);
      if (el) el.textContent = q.error ? 'Not saved: ' + q.error.message : label;
      return !q.error;
    }
    function editOpen(r, on) {
      var st = charts[r.id], ed = byEl('#hk-e-' + r.id); if (!st || !ed) return;
      if (on) { var a = r.data, d = a.chart, m = r.mine || {};
        st.edit = r.kind === 'brief' ? { bh: m.bh != null ? m.bh : d.bh, bl: m.bl != null ? m.bl : d.bl } : { entry: m.entry != null ? m.entry : a.entry, stop: m.stop != null ? m.stop : a.stop, tgt: m.tgt != null ? m.tgt : a.tgt };
        st.phase = m.phase || d.phase; st.hover = null;
        ed.querySelectorAll('.hk-ph').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ph === st.phase); });
      } else { st.edit = null; st.drag = null; }
      ed.hidden = !on; st.box.classList.toggle('hk-editing', on); draw(st);
    }
    // ---------- the study (Nestor, 6 Nov 2026: "place it on my chart replay in eurusd with notes, P/D zones, position tools etc for me to
    // check the legitimacy of what you thought were good trades"): the 159 trades of the 1-year rule test (stop 2-4 pips, target 20) from
    // hawk_study (admin RLS). A trade opens on Replay (opt.study, the app) with its drawings. He ticks each one valid / not a setup, writes
    // why, and draws on it; his own drawings on that stretch of chart are saved to the trade (drawings) - what the rules get tuned against.
    // "What if" (hawk_study_days: every candidate setup + its 1m path) re-runs his rules with another stop / target / BE / exit.
    var study = null, sfil = 'all', ssel = null, sview = 'trades', sOnChart = null, sStat = '';
    var sPer = (function () { try { return Object.assign({ k: 'all', from: '', to: '' }, JSON.parse(localStorage.getItem('st_hawk_period') || '{}')); } catch (x) { return { k: 'all', from: '', to: '' }; } })();
    var PERS = [['w', '1W', 7], ['m', '1M', 30], ['q', '3M', 91], ['h', '6M', 182], ['all', '1Y', 0], ['custom', 'Dates', 0]];
    function sPerSave() { try { localStorage.setItem('st_hawk_period', JSON.stringify(sPer)); } catch (x) {} }
    function sSpan() { return [study[0].day, study[study.length - 1].day]; }
    function sRange() { var sp = sSpan(), first = sp[0], last = sp[1];
      if (sPer.k === 'custom') { var f = sPer.from || first, t = sPer.to || last; return f > t ? [t, f] : [f, t]; }
      var b = PERS.filter(function (x) { return x[0] === sPer.k; })[0]; if (!b || !b[2]) return [first, last];
      var d = new Date(last + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - b[2] + 1); var f2 = d.toISOString().slice(0, 10); return [f2 < first ? first : f2, last]; }
    function sIn(day) { var r = sRange(); return day >= r[0] && day <= r[1]; }
    function sFmt(day) { return new Date(day + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    function sPerHtml(n) { var r = sRange(), sp = sSpan();
      return '<div class="hk-per"><div class="hk-seg" role="group" aria-label="Period">' + PERS.map(function (x) { return '<button data-per="' + x[0] + '" aria-pressed="' + (sPer.k === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        (sPer.k === 'custom' ? '<div class="hk-dates"><input type="date" data-pd="from" min="' + sp[0] + '" max="' + sp[1] + '" value="' + r[0] + '" aria-label="From"><span>to</span><input type="date" data-pd="to" min="' + sp[0] + '" max="' + sp[1] + '" value="' + r[1] + '" aria-label="To"></div>' : '') +
        '<div class="hk-pr">' + sFmt(r[0]) + ' – ' + sFmt(r[1]) + ' · ' + sPl(n, 'trade') + '</div></div>'; }
    var SOUT = { win: 'Target hit', loss: 'Stopped out', be: 'Break-even', time: 'Closed 13:20' };
    var MODEL = { reaction: 'Reaction', continuation: 'Continuation', 'initiation pocket': 'Initiation' };
    var PHASE = { range: 'Range day', 'trend up': 'Uptrend day', 'trend down': 'Downtrend day', initiation: 'Initiation' };
    var ICK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.2 8.6l3.1 3.1 6.5-7.2"/></svg>';
    var IX = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2"/></svg>';
    function sR(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + 'R'; }
    function sR1(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + 'R'; }
    function hm(t) { return LDN.format(new Date(t * 1000)); }
    function nyDay(t) { return new Date((t + 7 * 3600) * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }   // Replay's trading day (17:00 New York to 17:00)
    function ldnAt(t, min) { var x = hm(t); return t - t % 60 - ((+x.slice(0, 2) * 60 + +x.slice(3)) - min) * 60; }   // that London day's clock time, as a timestamp
    function sDay(r, o) { return new Date(r.day + 'T12:00:00Z').toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, o)); }
    function sPl(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
    function sPip(a, b) { return (Math.abs(a - b) * 1e4).toFixed(1); }
    function sFind(n) { return study ? study.find(function (x) { return x.n === +n; }) : null; }
    async function studyLoad() {
      statsEl.hidden = true; css(host.ownerDocument);
      if (study) { studyRender(); return; }
      list.innerHTML = '<p class="hk-empty">Loading the study…</p>';
      var s = await sb.auth.getSession();
      if (!s.data || !s.data.session) { list.innerHTML = '<p class="hk-empty">Sign in to Session Terminal first.</p>'; return; }
      var q = await sb.from('hawk_study').select('n, day, data, verdict, note, drawings, drawings_at, be_mine').eq('run', 'strict_20').order('n', { ascending: true });
      if (q.error) { list.innerHTML = '<p class="hk-empty">Couldn\'t load the study: ' + esc(q.error.message) + '</p>'; return; }
      study = q.data || [];
      if (!study.length) { list.innerHTML = '<p class="hk-empty">Admin only.</p>'; study = null; return; }
      if (period === 's') studyRender();
    }
    function sShown() { return study.filter(function (r) { var o = r.data.out; if (!sIn(r.day)) return false;
      return sfil === 'all' || (sfil === 'open' ? !r.verdict : sfil === 'be' ? (o === 'be' || o === 'time') : o === sfil); }); }
    function sTick(r, big) { return ['agree', 'disagree'].map(function (v) { var ok = v === 'agree', w = ok ? 'Valid setup' : 'Not a setup';
      return '<button data-tick="' + v + '" data-sn="' + r.n + '" aria-pressed="' + (r.verdict === v) + '" title="' + w + '" aria-label="' + w + ' #' + r.n + '">' + (ok ? ICK : IX) + (big ? '<span>' + w + '</span>' : '') + '</button>'; }).join(''); }
    function sDwN(r) { return (r.drawings || []).filter(function (x) { return x && !x.mbe; }).length; }
    function sMarks(r) { var m = [], k = sDwN(r); if (r.note) m.push('note'); if (r.be_mine) m.push(r.be_mine.none ? 'no BE' : 'your BE'); if (k) m.push(sPl(k, 'drawing')); return m.length ? '<u> · ' + m.join(' · ') + '</u>' : ''; }
    function sRow(r) { var d = r.data, buy = d.side > 0, rule = d.rule === 'initiation pocket' ? 'initiation' : d.rule;
      return '<div class="hk-tr" data-sn="' + r.n + '" aria-current="' + (ssel === r.n) + '"><button class="hk-trm" data-so="' + r.n + '" aria-expanded="' + (ssel === r.n) + '">' +
        '<span class="m"><i class="' + (buy ? 'buy' : 'sell') + '"></i>' + (buy ? 'Buy' : 'Sell') + ' · ' + esc(MODEL[d.model] || d.model) + '</span>' +
        '<span class="r ' + d.out + '">' + sR(d.net) + '</span>' +
        '<span class="s">' + esc(sDay(r, { weekday: 'short', day: '2-digit', month: 'short' }) + ' · ' + d.at + ' · ' + rule + ' · ' + d.loc) + sMarks(r) + '</span></button>' +
        '<div class="hk-vt">' + sTick(r) + '</div></div>'; }
    function sDwTxt(r) { var k = sDwN(r);
      return k ? sPl(k, 'drawing') + ' saved' + (r.drawings_at ? ' · ' + ldn(r.drawings_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '') : 'None saved yet'; }
    function sWhy(line) { var i = line.indexOf(': '); return '<li>' + (i > 0 && i < 34 ? '<b>' + esc(line.slice(0, i + 1)) + '</b>' + esc(line.slice(i + 1)) : esc(line)) + '</li>'; }
    // the explanation in three short blocks (Nestor: "it looks like a big blob of words"): the day, what happened, the trade's numbers
    function sExplain(d, r) { var buy = d.side > 0, tp = +sPip(d.tgt, d.entry);
      var what = String(d.note || '').split('\n').filter(function (l) { return l && !/^(HTF read|Buy |Sell |Break-even once|Target hit at|Stopped out at|Closed at)/.test(l); });
      var tt = [['Entry', p5(d.entry), buy ? 'Buy' : 'Sell', ''], ['Stop', p5(d.stop), sPip(d.stop, d.entry) + ' pips', 'sl'], ['Target', p5(d.tgt), tp.toFixed(0) + ' pips · ' + (tp / d.risk).toFixed(1) + 'R', 'tp']];
      if (d.be != null) tt.push(['Break-even', p5(d.be), 'the hawk: last 1m swing', '']);
      if (r.be_mine) tt.push(['Your BE', r.be_mine.none ? '–' : p5(r.be_mine.price), r.be_mine.none ? 'you wouldn\'t move it' : sBeVs(d, r.be_mine.price), 'mb']);
      return '<div class="hk-lbl">The day</div><div class="hk-kpi c3">' + [[PHASE[d.phase] || d.phase, 'HTF read'], [sPip(d.bh, d.bl) + ' pips', '24h to 08:00'], [p5((d.bh + d.bl) / 2), '50%']]
          .map(function (x) { return '<div><b>' + esc(x[0]) + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>' +
        '<div class="hk-lbl">What happened</div><ul class="hk-why">' + what.map(sWhy).join('') + '</ul>' +
        '<div class="hk-lbl">The trade</div><dl class="hk-tt">' + tt.map(function (x) { return '<dt>' + x[0] + '</dt><dd class="p ' + x[3] + '">' + x[1] + '</dd><dd class="x">' + esc(x[2]) + '</dd>'; }).join('') + '</dl>'; }
    function sDet(r) { var d = r.data, ap = !!opt.study;
      return '<div class="hk-det" id="hk-sd">' +
        '<div class="hk-dh"><span class="hk-out ' + d.out + '">' + SOUT[d.out] + '</span><span class="rr">' + sR(d.net) + '<small>' + sR(d.r) + ' before costs</small></span><span class="n">#' + r.n + ' · out ' + hm(d.xts) + '</span></div>' +
        '<div class="hk-nav"><button class="hk-btn" data-sa="prev" aria-label="Previous trade">‹</button>' + (ap ? '<button class="hk-btn go" data-sa="open">Show on Replay</button>' : '<span></span>') +
        '<button class="hk-btn" data-sa="next" aria-label="Next trade">›</button></div>' +
        (ap ? '<div class="hk-sst"><span id="hk-sst">' + esc(sStat) + '</span><button data-sa="clear">Hide the hawk\'s marks</button></div>' : '') +
        sExplain(d, r) +
        '<div class="hk-lbl">Your call</div><div class="hk-vb">' + sTick(r, true) + '</div>' +
        '<textarea data-snote="' + r.n + '" rows="3" placeholder="Your notes: what makes it valid, or not?">' + esc(r.note || '') + '</textarea>' +
        (ap ? '<div class="hk-lbl">Your break-even</div><div class="hk-dw"><span id="hk-sbe">' + sBeTxt(r) + '</span><span class="hk-bb"><button class="hk-btn" data-sa="beline">' + (r.be_mine && !r.be_mine.none ? 'Show my line' : 'Place my line') + '</button>' +
          '<button class="hk-btn" data-sa="benone" aria-pressed="' + !!(r.be_mine && r.be_mine.none) + '">No BE</button></span></div>' +
          '<p class="hk-hint">' + (d.be != null ? 'The hawk moves the stop to entry once price passes ' + p5(d.be) + '. ' : 'The hawk had no break-even level here. ') + 'Place your line, drag it to where you would do it, and it\'s kept with this trade.</p>' : '') +
        (ap ? '<div class="hk-lbl">Your drawings</div><div class="hk-dw"><span id="hk-sdw">' + sDwTxt(r) + '</span><button class="hk-btn" data-sa="mine">Save my drawings</button></div>' +
          '<p class="hk-hint">Draw on the Replay chart the way you would mark it up. Your drawings stay with this trade only: they\'re saved when you press Save or move on, and your normal Replay charts never show them.</p>' : '') +
        '<div class="hk-saved" id="hk-ss"></div></div>'; }
    function studyRender() {
      css(host.ownerDocument);
      var h = '<div class="hk-sh"><div><h4>Rule study</h4><p>EUR/USD · London 08–10 · 1 year</p></div><div class="hk-seg hk-vw" role="group" aria-label="View">' +
        [['trades', 'Trades'], ['whatif', 'What if']].map(function (v) { return '<button data-sw="' + v[0] + '" aria-pressed="' + (sview === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div></div>';
      var all = study.filter(function (r) { return sIn(r.day); });
      h += sPerHtml(sview === 'whatif' && wiD ? wiSim(WI0).length : all.length);
      if (sview === 'whatif') { list.innerHTML = h + wiHtml(); return; }
      var net = all.reduce(function (s, r) { return s + r.data.net; }, 0), won = all.filter(function (r) { return r.data.out === 'win'; }).length;
      var ag = all.filter(function (r) { return r.verdict === 'agree'; }).length, no = all.filter(function (r) { return r.verdict === 'disagree'; }).length, chk = ag + no;
      h += '<p class="hk-hint hk-lead">Your rules: stop 2–4 pips, target 20 pips, 0.6 pip costs.' + (opt.study ? ' Tap a trade to see it on Replay with its zones and position.' : '') + ' Tick the ones you\'d take, cross the ones you wouldn\'t.</p>' +
        '<div class="hk-kpi">' + [[all.length, 'Trades'], [sR1(net), 'Net', net >= 0 ? 'up' : 'dn'], [won, 'Targets'], [ag, 'You ✓', ag ? 'up' : '']]
          .map(function (s) { return '<div><b class="' + (s[2] || '') + '">' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('') + '</div>' +
        '<div class="hk-prog"><div class="t"><span>Checked <b>' + chk + '</b> of ' + all.length + '</span><span>' + ag + ' valid · ' + no + ' not</span></div>' +
        '<div class="hk-bar"><i class="ok" style="width:' + (ag / Math.max(1, all.length) * 100).toFixed(2) + '%"></i><i class="no" style="width:' + (no / Math.max(1, all.length) * 100).toFixed(2) + '%"></i></div></div>' +
        '<div class="hk-seg" role="group" aria-label="Show">' + [['all', 'All'], ['win', 'Wins'], ['loss', 'Losses'], ['be', 'BE'], ['open', 'To check']]
          .map(function (f) { return '<button data-sf="' + f[0] + '" aria-pressed="' + (sfil === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>';
      var rs = sShown(), last = '', mo = {};
      rs.forEach(function (r) { var k = r.day.slice(0, 7); mo[k] = mo[k] || [0, 0]; mo[k][0]++; mo[k][1] += r.data.net; });
      rs.forEach(function (r) { var k = r.day.slice(0, 7);
        if (k !== last) { last = k; h += '<div class="hk-mo"><span>' + esc(new Date(k + '-15T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })) + '</span><em>' + sPl(mo[k][0], 'trade') + '</em><b class="' + (mo[k][1] >= 0 ? 'up' : 'dn') + '">' + sR1(mo[k][1]) + '</b></div>'; }
        h += sRow(r) + (r.n === ssel ? sDet(r) : ''); });
      if (!rs.length) h += '<p class="hk-empty">No trades here.</p>';
      list.innerHTML = h;
    }
    function sRefresh() { var sc = sScroller(), k = sc ? sc.scrollTop : 0; studyRender(); if (sc) sc.scrollTop = k; }
    function sMsg(t) { var el = byEl('#hk-ss'); if (el) el.textContent = t; }
    function sStatus(t) { sStat = t; var el = byEl('#hk-sst'); if (el) el.textContent = t; }
    function sMarkRow(r) { var el = byEl('.hk-tr[data-sn="' + r.n + '"] .s'); if (!el) return; var u = el.querySelector('u'); if (u) u.remove(); el.insertAdjacentHTML('beforeend', sMarks(r)); }
    function sDraw(r) { var d = r.data, buy = d.side > 0, q = (d.bh - d.bl) / 4, mid = (d.bh + d.bl) / 2, w0 = ldnAt(d.ts, 480), t0 = w0 - 25 * 3600, t1 = w0 + 2 * 3600, x1 = Math.max(d.xts, d.ts + 1800);
      // the P/D zone is the Session Indicator's own (pd below); these three only for a study row without its range window
      var o = d.r0 ? [] : [
        { type: 'rect', a: { t: t0, price: d.bh }, b: { t: t1, price: d.bh - q }, color: '#F6465D', width: 1, fill: 'rgba(246,70,93,0.07)', text: 'Premium', tcol: '#F6465D', ta: 'l', tv: 'top' },
        { type: 'rect', a: { t: t0, price: d.bl + q }, b: { t: t1, price: d.bl }, color: '#2EBD85', width: 1, fill: 'rgba(46,189,133,0.07)', text: 'Discount', tcol: '#2EBD85', ta: 'l', tv: 'bottom' },
        { type: 'trend', a: { t: t0, price: mid }, b: { t: t1, price: mid }, color: '#8b90a0', width: 1, dash: 'dashed', text: '50%' }];
      // the high (low) the sweep took, drawn from the candle that made it to the break (Nestor: "can the high line extend from the high so
      // i can see quickly where its coming from?")
      if (d.lq != null && d.lqt) o.push({ type: 'trend', a: { t: d.lqt, price: d.lq }, b: { t: Math.max(d.sw || d.ts, d.lqt + 60) + 900, price: d.lq }, color: '#e0a84a', width: 2,
        text: (buy ? 'Low of the last hour ' : 'High of the last hour ') + hm(d.lqt) + ' · taken ' + hm(d.sw || d.ts) });
      else if (d.a != null && d.ta) o.push({ type: 'trend', a: { t: d.ta - 3600, price: d.a }, b: { t: d.ta + 1800, price: d.a }, color: '#e0a84a', width: 2,
        text: d.model === 'initiation pocket' ? (buy ? 'Range high broken' : 'Range low broken') : (buy ? 'Low taken ' : 'High taken ') + hm(d.ta) });
      o.push({ type: buy ? 'long' : 'short', a: { t: d.ts, price: d.entry }, b: { t: x1, price: d.entry }, sl: d.stop, tp: d.tgt });
      if (d.be != null) o.push({ type: 'trend', a: { t: d.ts, price: d.be }, b: { t: x1, price: d.be }, color: '#5b8def', width: 1, dash: 'dotted', text: 'BE trigger' });
      o.push({ type: 'text', a: { t: d.ts, price: d.tgt + d.side * 0.00025 }, color: '#5b8def', width: 2,
        text: '#' + r.n + ' ' + (buy ? 'Buy' : 'Sell') + ' · ' + (MODEL[d.model] || d.model) + ' · ' + d.loc + '\n' + SOUT[d.out] + ' ' + hm(d.xts) + ' · ' + sR(d.net) });
      return o;
    }
    async function sOpen(r) { if (!opt.study) return; sStatus('Opening ' + sDay(r, { day: 'numeric', month: 'short', year: 'numeric' }) + ' on Replay…');
      var d = r.data, at = Math.min(d.sw || d.ts, d.ta || d.ts, d.ts) - 600, ok = false;
      try { ok = await opt.study({ sym: 'EURUSD', day: nyDay(d.ts), at: at, draw: sDraw(r), pd: d.r0 ? { a: d.r0, b: d.r1 } : null, n: r.n, keep: r.drawings || [], onMine: sOnMine }); } catch (x) {}
      if (ok === 'no') { if (ssel === r.n) sStatus('Not opened. Pick the trade again when you want it on the chart.'); return; }   // he chose to stay where he was
      if (ok) sOnChart = r.n;
      if (ssel === r.n) { sStatus(ok ? 'On Replay from ' + hm(at) + ' London. Press Play to watch it unfold.' : 'Replay couldn\'t open that day.'); setTimeout(function () { sShow(r.n); }, 120); }   // going into Replay lays the column out again
    }
    // what he drew on a trade (Replay's study layer, never his normal Replay drawings), kept with the trade: handed back by the app when
    // he moves to another trade or leaves the study, or fetched by Save
    function sBeVs(d, px) { var dd = (px - d.be) * d.side * 1e4; return d.be == null ? sPip(px, d.entry) + ' pips from entry' : Math.abs(dd) < 0.05 ? 'same as the hawk' : Math.abs(dd).toFixed(1) + ' pips ' + (dd > 0 ? 'further' : 'sooner') + ' than the hawk'; }
    function sBeTxt(r) { var b = r.be_mine; return !b ? 'Not set: the hawk\'s level is used' : b.none ? 'You wouldn\'t move to break-even' : 'Yours: <b>' + p5(b.price) + '</b> · ' + sBeVs(r.data, b.price); }
    async function sBeLine(r) { if (sOnChart !== r.n) { sMsg('Open this trade on Replay first, then place your line.'); return; }
      var d = r.data, b = r.be_mine, px = b && b.price != null ? b.price : d.be != null ? d.be : r5(d.entry + d.side * d.risk * 1e-4), ok = false;
      try { ok = await opt.study({ addBe: { n: r.n, t: d.ts, price: px } }); } catch (x) {}
      sMsg(ok ? 'Drag the pink "My BE" line to your level. It\'s kept when you press Save or move to another trade.' : 'Replay isn\'t showing this trade any more. Open it again first.'); }
    async function sBeNone(r) { var none = !(r.be_mine && r.be_mine.none), be = none ? { none: true } : null;
      if (none && sOnChart === r.n) try { await opt.study({ addBe: { n: r.n, price: null } }); r.drawings = (r.drawings || []).filter(function (x) { return x && !x.mbe; }); if (!r.drawings.length) r.drawings = null; } catch (x) {}
      var patch = { be_mine: be }; if (none) patch.drawings = r.drawings || null;
      var q = await sb.from('hawk_study').update(patch).eq('run', 'strict_20').eq('n', r.n);
      if (q.error) { sMsg('Not saved: ' + q.error.message); return; }
      r.be_mine = be; sRefresh(); sMsg(none ? 'Saved: no break-even on this one' : 'Cleared'); }
    function sOnMine(n, list, ended) { var r = sFind(n); if (ended && sOnChart === +n) sOnChart = null; if (r) sKeep(r, list, false); }
    async function sKeep(r, list, ask) { var now = list && list.length ? list : null, ln = (list || []).filter(function (x) { return x && x.mbe && x.a; })[0];
      var be = ln ? { price: r5(ln.a.price) } : (r.be_mine && r.be_mine.none ? r.be_mine : null);
      var same = JSON.stringify(now) === JSON.stringify(r.drawings || null), sameBe = JSON.stringify(be) === JSON.stringify(r.be_mine || null);
      if (same && sameBe) { if (ask) sMsg(now ? 'Already saved.' : 'No drawings of yours on this trade yet.'); return true; }
      var at = new Date().toISOString(), patch = {}; if (!same) { patch.drawings = now; patch.drawings_at = at; } if (!sameBe) patch.be_mine = be;
      var q = await sb.from('hawk_study').update(patch).eq('run', 'strict_20').eq('n', r.n);
      if (q.error) { sMsg('Not saved: ' + q.error.message); return false; }
      if (!same) { r.drawings = now; r.drawings_at = at; } r.be_mine = be; sMarkRow(r);
      if (ssel === r.n && !sameBe) sRefresh();
      if (ssel === r.n) { var el = byEl('#hk-sdw'); if (el) el.textContent = sDwTxt(r); var eb = byEl('#hk-sbe'); if (eb) eb.innerHTML = sBeTxt(r);
        var k = sDwN(r); sMsg(!sameBe && be && be.price != null ? 'Your break-even saved: ' + p5(be.price) + (same ? '' : ' · ' + sPl(k, 'drawing')) : now ? sPl(k, 'drawing') + ' saved to #' + r.n : 'Drawings removed from #' + r.n); }
      return true; }
    async function sCapture(r, ask) { if (!r || !opt.study) return false;
      if (sOnChart !== r.n) { if (ask) sMsg('Open this trade on Replay first, then draw on it.'); return false; }
      var got = null; try { got = await opt.study({ get: r.n }); } catch (x) {}
      if (!Array.isArray(got)) { if (ask) sMsg('Replay isn\'t showing this trade any more. Open it again, then draw.'); return false; }
      return sKeep(r, got, ask); }
    // leaving the study (another view or tab, the trade closed): his own Replay drawings come back
    function sEnd() { if (sOnChart == null || !opt.study) return; sOnChart = null; try { opt.study({ end: true }); } catch (x) {} }
    function sScroller() { for (var e = host; e && e !== doc.body; e = e.parentElement) { var o = getComputedStyle(e).overflowY; if ((o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight) return e; } return null; }
    function sShow(n) { var sc = sScroller(), row = byEl('.hk-tr[data-sn="' + n + '"]');   // the open trade in view: the panel scrolls, never the page (the platform's bars stay put)
      if (row && sc) { var rt = row.getBoundingClientRect().top - sc.getBoundingClientRect().top; if (rt < 40 || rt > sc.clientHeight * 0.45) sc.scrollTop += rt - 40; }
      else if (row && !sc && !opt.app) row.scrollIntoView({ block: 'nearest' }); }
    async function sPick(n, open) {
      sStat = ''; ssel = n; sRefresh(); sShow(n); var r = sFind(n); if (r && open) sOpen(r); }
    async function sSave(r, patch, stamp, label) { patch[stamp] = new Date().toISOString();
      var q = await sb.from('hawk_study').update(patch).eq('run', 'strict_20').eq('n', r.n);
      if (ssel === r.n) sMsg(q.error ? 'Not saved: ' + q.error.message : label); return !q.error; }
    async function sVerdict(r, v) { v = r.verdict === v ? null : v; var was = r.verdict; r.verdict = v; sRefresh();
      if (!(await sSave(r, { verdict: v }, 'verdict_at', v ? (v === 'agree' ? 'Marked a valid setup' : 'Marked not a setup') : 'Cleared'))) { r.verdict = was; sRefresh(); } }

    // ---------- what if (Nestor: "give me the option to vary these to check if id have a better edge if my SL was bigger, smaller, further
    // TPs, smaller TPs"): his rules again with another stop / target / break-even / exit. Same entries; the two-serve day re-runs, since a
    // different result changes which later setups it lets through. Prices are ints (price * 1e5; 10 = 1 pip). With his settings it gives
    // exactly the study (159 trades, +53.98R - checked against bt/whatif_sim.py).
    var WI0 = { smode: 'hawk', soff: 0, sfix: 3, tmode: 'pips', tp: 20, tr: 5, be: 'hawk', ber: 1, exit: 800, cost: 0.6 };
    var WB = { soff: [-2, 10, 0.5], sfix: [1, 20, 0.5], tp: [3, 100, 1], tr: [1, 20, 0.5], ber: [0.25, 10, 0.25], cost: [0, 3, 0.1], exit: [600, 1200, 10] };   // exit: London minutes, 10:00 to 20:00 (the candles stop at 20:00)
    var wiP = (function () { try { return Object.assign({}, WI0, JSON.parse(localStorage.getItem('st_hawk_whatif') || '{}')); } catch (x) { return Object.assign({}, WI0); } })();
    var wiD = null, wiErr = '', wiBusy = false, wiBase = null;
    async function wiLoad() { if (wiD || wiBusy) return; wiBusy = true; wiErr = '';
      var q = await sb.from('hawk_study_days').select('day, d').eq('run', 'strict_20').order('day', { ascending: true });
      wiBusy = false; if (q.error) wiErr = q.error.message; else wiD = q.data || [];
      if (period === 's' && sview === 'whatif') sRefresh(); }
    function wiMB() { var o = {}; (study || []).forEach(function (r) { var b = r.be_mine; if (b) o[r.day + '|' + r.data.side + '|' + Math.round(r.data.entry * 1e5)] = b.none ? null : Math.round(b.price * 1e5); }); return o; }
    function wiSim(p) { var out = [], ex = Math.min(+p.exit, 1200), MB = p.be === 'mine' ? wiMB() : {};
      wiD.forEach(function (D) { if (!sIn(D.day)) return; var d = D.d, m = d.m, base = d.b, n = m.length / 5, taken = [], seen = {}, busy = -1;
        for (var k = 0; k < d.c.length; k++) { var c = d.c[k], i = c[0], side = c[1], e = c[2], s0 = c[3], key = c[7] + ':' + side + ':' + e, lt = taken[taken.length - 1];
          if (seen[key] || i <= busy) continue; seen[key] = 1;
          if (taken.length >= 2 || (lt && lt.o === 'win')) break;   // the tennis serve: two serves a day, done after a winner
          if (lt && lt.o === 'loss' && !c[8]) continue;             // after a loss only a continuation / initiation
          var r0 = Math.abs(e - s0), risk = Math.max(10, Math.round(p.smode === 'hawk' ? r0 + p.soff * 10 : p.sfix * 10));
          var tg = e + side * (p.tmode === 'pips' ? Math.round(p.tp * 10) : Math.round(p.tr * risk));
          var mk = D.day + '|' + side + '|' + e, bel = p.be === 'hawk' ? c[5] : p.be === 'mine' ? (mk in MB ? MB[mk] : c[5]) : p.be === 'off' ? null : e + side * Math.round(p.ber * risk);
          var R = null, o = 'time', j = i;
          if (c[6] && risk <= r0) { R = -1; o = 'loss'; }                // stopped on the fill bar
          else { var cur = e - side * risk, at = false;
            for (j = i; j < n; j++) { var x = j * 5;
              if (m[x] >= ex) { var px = m[x + 1] + base; R = (px - e) * side / risk; o = at && (px - e) * side <= 2 ? 'be' : 'time'; break; }
              var H = m[x + 2] + base, L = m[x + 3] + base;
              if (side > 0) { if (L <= cur) { R = (cur - e) / risk; o = at ? 'be' : 'loss'; break; } if (H >= tg) { R = (tg - e) / risk; o = 'win'; break; } if (!at && bel != null && H > bel) { cur = e; at = true; } }
              else { if (H >= cur) { R = (e - cur) / risk; o = at ? 'be' : 'loss'; break; } if (L <= tg) { R = (e - tg) / risk; o = 'win'; break; } if (!at && bel != null && L < bel) { cur = e; at = true; } }
            }
            if (R == null) { R = 0; o = 'time'; j = n - 1; } }
          var t = { o: o, net: R - p.cost / (risk / 10), cr: p.cost / (risk / 10) }; taken.push(t); out.push(t); busy = j; } });
      return out; }
    function wiStats(t) { var s = { n: t.length, net: 0, dd: 0, run: 0, win: 0, be: 0, gp: 0, gl: 0, eq: [0], cr: 0 }, peak = 0, cur = 0;
      t.forEach(function (x) { s.net += x.net; s.cr += x.cr || 0; s.eq.push(s.net); peak = Math.max(peak, s.net); s.dd = Math.max(s.dd, peak - s.net);
        if (x.o === 'loss') { cur++; s.run = Math.max(s.run, cur); } else if (x.o === 'win') cur = 0;
        if (x.o === 'win') s.win++; if (x.o === 'be') s.be++; if (x.net > 0) s.gp += x.net; else s.gl -= x.net; });
      s.pf = s.gl ? s.gp / s.gl : null; s.avg = s.n ? s.net / s.n : 0; return s; }
    function wiStep(k, unit) { var b = WB[k];
      return '<div class="hk-stp"><button data-ws="' + k + '" data-d="-' + b[2] + '" aria-label="Less">−</button><label><input type="number" data-wn="' + k + '" min="' + b[0] + '" max="' + b[1] + '" step="' + b[2] + '" value="' + wiP[k] + '">' + unit + '</label>' +
        '<button data-ws="' + k + '" data-d="' + b[2] + '" aria-label="More">+</button></div>'; }
    function wiSeg(k, opts) { return '<div class="hk-seg" role="group">' + opts.map(function (o) { return '<button data-wm="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(wiP[k]) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
    function wiRow(lbl, seg, body, note) { return '<div class="hk-wr"><div class="h"><span>' + lbl + '</span>' + seg + '</div>' + (body || '') + (note ? '<div class="note">' + note + '</div>' : '') + '</div>'; }
    function wiEq(a, b) { var all = a.concat(b), lo = Math.min.apply(null, all.concat(0)), hi = Math.max.apply(null, all.concat(0)), sp = hi - lo || 1;
      function y(v) { return (4 + (hi - v) / sp * 88).toFixed(1); }
      function path(e) { return e.map(function (v, i) { return (i ? 'L' : 'M') + (i / Math.max(1, e.length - 1) * 300).toFixed(1) + ' ' + y(v); }).join(''); }
      return '<svg class="hk-eq" viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="300" y1="' + y(0) + '" y2="' + y(0) + '"/><path class="b" d="' + path(b) + '"/><path class="a" d="' + path(a) + '"/></svg>'; }
    function wiGrid() { var p = wiP, sk = p.smode === 'hawk' ? 'soff' : 'sfix', tk = p.tmode === 'pips' ? 'tp' : 'tr';
      var rows = sk === 'soff' ? [-1, -0.5, 0, 0.5, 1, 2, 3, 5] : [1.5, 2, 3, 4, 5, 6, 8, 10], cols = tk === 'tp' ? [10, 15, 20, 25, 30, 40, 50, 60] : [2, 3, 4, 5, 6, 8, 10, 12];
      var v = rows.map(function (rv) { return cols.map(function (cv) { var q = Object.assign({}, p); q[sk] = rv; q[tk] = cv; return wiStats(wiSim(q)).net; }); });
      var mx = Math.max.apply(null, v.map(function (r) { return Math.max.apply(null, r.map(Math.abs)); })) || 1;
      var isBase = function (rv, cv) { return sk === 'soff' && tk === 'tp' && rv === 0 && cv === 20 && p.be === 'hawk' && +p.exit === 800 && +p.cost === 0.6; };
      return '<div class="hk-hm"><div class="ax"><span>' + (sk === 'soff' ? 'Stop vs the hawk\'s, pips' : 'Stop, pips') + ' ↓</span><span>Target ' + (tk === 'tp' ? '(pips)' : '(R)') + ' →</span></div><table><thead><tr><th class="y"></th>' +
        cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (rv, i) { return '<tr><th class="y">' + (sk === 'soff' ? (rv === 0 ? 'hawk\'s' : (rv > 0 ? '+' : '−') + Math.abs(rv)) : rv) + '</th>' + cols.map(function (cv, j) { var x = v[i][j], a = Math.round(Math.min(1, Math.abs(x) / mx) * 62);
          return '<td><button data-wg="' + sk + '|' + rv + '|' + tk + '|' + cv + '" class="' + (isBase(rv, cv) ? 'base' : '') + '" aria-current="' + (+p[sk] === rv && +p[tk] === cv) + '" title="Stop ' + (sk === 'soff' ? (rv === 0 ? 'as the hawk placed it' : Math.abs(rv) + ' pip' + (Math.abs(rv) === 1 ? '' : 's') + (rv > 0 ? ' wider' : ' tighter') + ' than the hawk\'s') : rv + ' pips') + ', target ' + cv + (tk === 'tp' ? ' pips' : 'R') + ': ' + sR1(x) + '" style="background:color-mix(in srgb,var(' + (x >= 0 ? '--hk-buy' : '--hk-sell') + ') ' + a + '%,transparent)">' + (x < -0.5 ? '−' : '') + Math.abs(Math.round(x)) + '</button></td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>'; }
    function wiHtml() {
      if (!wiD) { if (!wiErr) wiLoad(); return wiErr ? '<p class="hk-empty">Couldn\'t load the candles behind the study: ' + esc(wiErr) + '</p>' : '<p class="hk-empty">Loading a year of 1-minute candles…</p>'; }
      var p = wiP, changed = Object.keys(WI0).some(function (k) { return String(p[k]) !== String(WI0[k]); });
      wiBase = wiStats(wiSim(WI0));
      var s = wiStats(wiSim(p)), b = wiBase, dn = s.net - b.net, ddd = s.dd - b.dd;
      var h = '<div class="hk-wtop"><span>Your rules again with these changes: the same entries, the same two-serve day.</span>' + (changed ? '<button data-wreset="1">Back to your rules</button>' : '') + '</div><div class="hk-wc">' +
        wiRow('Stop', wiSeg('smode', [['hawk', 'Adjust hawk\'s'], ['fixed', 'Same every trade']]), p.smode === 'hawk' ? wiStep('soff', 'pips') : wiStep('sfix', 'pips'),
          p.smode === 'hawk' ? (+p.soff ? 'The hawk\'s 2–4 pip stop, ' + (p.soff > 0 ? 'widened' : 'tightened') + ' by ' + Math.abs(p.soff).toFixed(1) + ' pips (never under 1).' : 'As the hawk placed it: 0.5 pip past the high or low it took, 2–4 pips from the entry.') : 'Every trade gets a ' + (+p.sfix) + '-pip stop from the entry, wherever the high or low was.') +
        wiRow('Target', wiSeg('tmode', [['pips', 'Pips'], ['r', 'R']]), p.tmode === 'pips' ? wiStep('tp', 'pips') : wiStep('tr', 'R'), p.tmode === 'pips' ? 'A fixed distance from the entry.' : 'A multiple of each trade\'s stop.') +
        wiRow('Break-even', wiSeg('be', [['hawk', 'Rule'], ['mine', 'Yours'], ['r', 'At R'], ['off', 'Off']]), p.be === 'r' ? wiStep('ber', 'R') : '',
          p.be === 'hawk' ? 'Stop to entry once price passes the last 1m swing before the entry.' : p.be === 'mine' ? (function () { var k = (study || []).filter(function (r) { return r.be_mine && sIn(r.day); }).length; return k ? 'Your own break-even on the ' + sPl(k, 'trade') + ' you set it on, the hawk\'s on the rest.' : 'You haven\'t set your own break-even on any trade yet, so this is the hawk\'s.'; })() : p.be === 'off' ? 'The stop never moves.' : 'Stop to entry once the trade is ' + (+p.ber).toFixed(2) + 'R in profit.') +
        wiRow('Close by', wiSeg('exit', [[800, '13:20'], [960, '16:00'], [1200, '20:00']]),
          '<div class="hk-stp"><button data-ws="exit" data-d="-10" aria-label="10 minutes earlier">−</button><label><input type="time" data-wn="exit" min="10:00" max="20:00" step="600" value="' + wiHM(+p.exit) + '">London</label><button data-ws="exit" data-d="10" aria-label="10 minutes later">+</button></div>',
          +p.exit === 800 ? 'Out before the 13:30 news if the target hasn\'t hit (your rule).' : 'Closed at ' + wiHM(+p.exit) + ' London if the target hasn\'t hit' + (+p.exit > 810 ? ', held through the 13:30 news.' : '.')) +
        wiRow('Costs', '', wiStep('cost', 'pips a trade'), +p.cost ? 'About ' + (s.n ? s.cr / s.n : 0).toFixed(2) + 'R a trade with these stops, ' + s.cr.toFixed(1) + 'R over the period. Spread and commission are paid in pips, so the tighter the stop, the more R they cost.' : 'No spread or commission.') + '</div>';
      h += '<div class="hk-lbl">Result</div><div class="hk-kpi">' + [[sR1(s.net), 'Net', s.net >= 0 ? 'up' : 'dn'], [s.n, 'Trades'], [(s.n ? Math.round(s.win / s.n * 100) : 0) + '%', 'Targets'], [s.dd.toFixed(1) + 'R', 'Worst dip']]
        .map(function (x) { return '<div><b class="' + (x[2] || '') + '">' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
      h += '<div class="hk-cmp">' + (changed ? 'Against your rules: <b class="' + (dn >= 0 ? 'up' : 'dn') + '">' + sR1(dn) + '</b> · worst dip ' + (Math.abs(ddd) < 0.05 ? 'the same' : Math.abs(ddd).toFixed(1) + 'R ' + (ddd > 0 ? 'deeper' : 'shallower')) : 'These are your rules as tested: ' + sR1(b.net) + ' over this period.') + '</div>';
      h += '<div class="hk-kpi sm">' + [[(s.avg >= 0 ? '+' : '−') + Math.abs(s.avg).toFixed(2) + 'R', 'Per trade'], [s.pf == null ? '–' : s.pf.toFixed(2), 'Profit factor'], [(s.n ? Math.round(s.be / s.n * 100) : 0) + '%', 'Break-even'], [s.run, 'Loss streak']]
        .map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
      h += wiEq(s.eq, b.eq) + '<div class="hk-leg"><span><i></i>These settings</span><span><i class="b"></i>Your rules</span></div>';
      h += '<div class="hk-lbl">Net R by stop and target</div>' + wiGrid() +
        '<p class="hk-hint">Tap a square to try it. ' + b.n + ' trades is a small sample and a handful of big winners carry the year, so trust a broad patch of green over one bright square. A smaller stop means a bigger position for the same risk, so costs bite harder.</p>';
      return h; }
    function wiHM(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
    function wiClamp(k, v) { var b = WB[k]; v = Math.round(v / b[2]) * b[2]; return Math.min(b[1], Math.max(b[0], +v.toFixed(2))); }
    function wiSet() { try { localStorage.setItem('st_hawk_whatif', JSON.stringify(wiP)); } catch (x) {} sRefresh(); }
    function wiClick(e) {
      var a = e.target.closest('[data-wm]'); if (a) { wiP[a.dataset.wm] = a.dataset.wm === 'exit' ? +a.dataset.v : a.dataset.v; wiSet(); return true; }
      var s = e.target.closest('[data-ws]'); if (s) { var k = s.dataset.ws; wiP[k] = wiClamp(k, +wiP[k] + +s.dataset.d); wiSet(); return true; }
      var g = e.target.closest('[data-wg]'); if (g) { var v = g.dataset.wg.split('|'); wiP[v[0]] = +v[1]; wiP[v[2]] = +v[3]; wiSet(); return true; }
      if (e.target.closest('[data-wreset]')) { wiP = Object.assign({}, WI0); wiSet(); return true; }
      return false; }
    root.addEventListener('click', async function (e) {
      var t = e.target.closest('.hk-tabs button');
      if (t) { if (period === 's' && t.dataset.p !== 's') sEnd(); period = t.dataset.p === 's' ? 's' : +t.dataset.p; tabs(); load(); return; }
      if (study && period === 's') {
        var sw = e.target.closest('[data-sw]'); if (sw) { if (sview !== sw.dataset.sw) { sEnd(); sview = sw.dataset.sw; sRefresh(); } return; }
        var pk = e.target.closest('[data-per]'); if (pk) { sPer.k = pk.dataset.per; sPerSave(); sRefresh(); return; }
        if (sview === 'whatif') { wiClick(e); return; }
        var f = e.target.closest('[data-sf]'); if (f) { sfil = f.dataset.sf; sRefresh(); return; }
        var tk = e.target.closest('[data-tick]'); if (tk) { var tr0 = sFind(tk.dataset.sn); if (tr0) sVerdict(tr0, tk.dataset.tick); return; }
        var so = e.target.closest('[data-so]'); if (so) { var n = +so.dataset.so; if (n === ssel) { sEnd(); ssel = null; sRefresh(); } else sPick(n, true); return; }
        var sr = sFind(ssel);
        var sa = e.target.closest('[data-sa]'); if (sa && sr) { var rs = sShown(), i = rs.indexOf(sr);
          if (sa.dataset.sa === 'open') sOpen(sr);
          else if (sa.dataset.sa === 'mine') sCapture(sr, true);
          else if (sa.dataset.sa === 'beline') sBeLine(sr);
          else if (sa.dataset.sa === 'benone') sBeNone(sr);
          else if (sa.dataset.sa === 'clear') { try { opt.study({ clear: true }); } catch (x) {} sStatus('The hawk\'s marks are off the chart. Yours stay.'); }
          else { var nx = rs[i + (sa.dataset.sa === 'next' ? 1 : -1)]; if (nx) sPick(nx.n, true); }
          return; }
        return;
      }
      var b = e.target.closest('[data-act]'); if (!b) return;
      var r = byId(b.dataset.id); if (!r) return;
      var act = b.dataset.act, st = charts[r.id];
      if (act === 'rate') { r.feedback = r.feedback === b.dataset.f ? null : b.dataset.f;
        b.parentNode.querySelectorAll('.hk-btn').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.f === r.feedback); });
        save(r.id, { feedback: r.feedback }, r.feedback ? 'Saved' : 'Cleared'); stats(); return; }
      if (act === 'edit') { editOpen(r, !(st && st.edit)); return; }
      if (act === 'cancel') { editOpen(r, false); return; }
      if (act === 'ph') { st.phase = b.dataset.ph; b.parentNode.querySelectorAll('.hk-ph').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); return; }
      if (act === 'save' || act === 'clear') {
        var mine = act === 'clear' ? null : Object.assign({}, st.edit, r.kind === 'brief' ? { phase: st.phase } : {}, { at: new Date().toISOString() });
        if (await save(r.id, { mine: mine }, act === 'clear' ? 'Your read removed' : 'Your read saved — the hawk will learn from it')) {
          r.mine = mine; byEl('#hk-m-' + r.id).textContent = mineText(r); editOpen(r, false); stats(); }
      }
    });
    root.addEventListener('change', function (e) {
      if (e.target.dataset.pd) { sPer[e.target.dataset.pd] = e.target.value || ''; sPerSave(); sRefresh(); return; }
      if (e.target.dataset.wn) { var k = e.target.dataset.wn, v = e.target.value; if (k === 'exit') { if (!/^\d\d:\d\d/.test(v)) return; v = +v.slice(0, 2) * 60 + +v.slice(3, 5); } wiP[k] = wiClamp(k, +v || 0); wiSet(); return; }
      if (e.target.tagName !== 'TEXTAREA') return;
      if (e.target.dataset.snote && study) { var sr = sFind(e.target.dataset.snote); if (sr) { sr.note = e.target.value.trim() || null; sMarkRow(sr); sSave(sr, { note: sr.note }, 'verdict_at', sr.note ? 'Note saved' : 'Note removed'); } return; }
      var r = byId(e.target.dataset.id); if (!r) return;
      r.note = e.target.value.trim(); save(r.id, { note: r.note || null }, 'Note saved');
    });
    load(); poll();
    return { reload: function () { load(); }, redraw: function () { todayPaint(); redraw(); }, today: todayPaint };
  }
  window.STHawk = { mount: mount, draw: draw };
})();
