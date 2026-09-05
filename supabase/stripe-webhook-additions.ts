// Reference copy of the two cases added to the `stripe-webhook` edge function on 2026-09-05.
// The deployed source lives in Supabase, not this repo; this file exists so the reasoning is
// reviewable and so the next person does not have to diff a live function to find out what changed.
//
// NOTHING EXISTING WAS TOUCHED. This function is "the ONLY thing that may set is_paid", and the
// subscription cases are what grant and revoke access - so the two new cases only write to
// st_payments and never to profiles. A bug in them can lose a ledger row; it cannot lock anybody
// out of the app they paid for.
//
// WHY invoice.paid AND NOT invoice.payment_succeeded: Stripe sends both for the same money.
// Recording both would double-count, except that stripe_invoice_id is UNIQUE and the write is an
// upsert on it - so a duplicate event, a Stripe retry, and a manual replay all land on the same
// row. That constraint is the entire idempotency story and must not be removed.

/*
      // ---------------------------------------------------------------------
      // Money actually arrived. This is the ledger the run-rate figures cannot
      // provide: what was collected, and when.
      // ---------------------------------------------------------------------
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const userId = customerId ? await findUserByCustomer(customerId) : null;

        // A line's price arrives in different places depending on the API version the payload was
        // rendered at - the same asymmetry documented on periodEndOf(). Read every known shape
        // rather than trusting one.
        const line = inv.lines?.data?.[0] as unknown as {
          price?: { id?: string };
          pricing?: { price_details?: { price?: string } };
          period?: { start?: number; end?: number };
        } | undefined;
        const priceId = line?.price?.id ?? line?.pricing?.price_details?.price ?? null;

        // status_transitions.paid_at is when the money moved; inv.created is when the invoice was
        // drawn up. They differ, and only the first is a takings date.
        const paidAtSec = (inv.status_transitions?.paid_at ?? inv.created) as number;

        const row = {
          stripe_invoice_id: inv.id,
          stripe_customer_id: customerId ?? null,
          user_id: userId,
          plan: priceId ? planNameFromPrice(priceId) : null,
          amount_paid: inv.amount_paid ?? 0,          // minor units, exactly as Stripe sends it
          currency: (inv.currency ?? "gbp").toLowerCase(),
          paid_at: new Date(paidAtSec * 1000).toISOString(),
          period_start: line?.period?.start ? new Date(line.period.start * 1000).toISOString() : null,
          period_end: line?.period?.end ? new Date(line.period.end * 1000).toISOString() : null,
        };

        // Upsert, not insert: Stripe retries, and a second row would overstate takings with no
        // error raised anywhere. amount_refunded is deliberately absent so a replayed invoice.paid
        // cannot wipe a refund recorded later.
        const { error } = await admin
          .from("st_payments")
          .upsert(row, { onConflict: "stripe_invoice_id" });

        if (error) {
          // Worth retrying: a lost ledger row is money missing from every future report, and
          // unlike an access change there is nothing else that would reveal it.
          console.error("[stripe] could not record payment", inv.id, error.message);
          return json({ received: true, recorded: false, reason: error.message }, 500);
        }
        return json({ received: true, recorded: true, amount: row.amount_paid }, 200);
      }

      // A refund makes earlier takings wrong. Recording the payment and ignoring the reversal
      // would leave the report confidently overstating what was kept.
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const invId = typeof ch.invoice === "string" ? ch.invoice : ch.invoice?.id;
        if (!invId) return json({ received: true, refund: "no invoice on charge" }, 200);

        // Stripe sends the running TOTAL refunded on the charge, not the delta, so assigning it is
        // correct and repeated events converge rather than accumulate.
        const { error } = await admin
          .from("st_payments")
          .update({ amount_refunded: ch.amount_refunded ?? 0 })
          .eq("stripe_invoice_id", invId);

        if (error) {
          console.error("[stripe] could not record refund", invId, error.message);
          return json({ received: true, refunded: false, reason: error.message }, 500);
        }
        return json({ received: true, refunded: ch.amount_refunded ?? 0 }, 200);
      }
*/
