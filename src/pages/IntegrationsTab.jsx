import { useState } from 'react';

export default function IntegrationsTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const integrations = cfg.integrations || {};
  const [data, setData] = useState({
    instagramShop: { activo: integrations.instagramShop?.activo || false, businessId: integrations.instagramShop?.businessId || '', token: integrations.instagramShop?.token || '' },
    tiktokShop: { activo: integrations.tiktokShop?.activo || false, shopId: integrations.tiktokShop?.shopId || '', token: integrations.tiktokShop?.token || '' },
    googleAds: { activo: integrations.googleAds?.activo || false, clientId: integrations.googleAds?.clientId || '', accessToken: integrations.googleAds?.accessToken || '' },
    mailchimp: { activo: integrations.mailchimp?.activo || false, apiKey: integrations.mailchimp?.apiKey || '', listId: integrations.mailchimp?.listId || '' },
    slack: { activo: integrations.slack?.activo || false, webhookUrl: integrations.slack?.webhookUrl || '' },
  });
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('key') || ''}` },
        body: JSON.stringify({ ...cfg, integrations: data }),
      });
      if (res.ok) flash('Integraciones actualizadas.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        Conecta tu tienda con Instagram, TikTok, Google Ads, Email y Slack.
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">📱 Instagram Shop</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.instagramShop.activo}
              onChange={(e) => setData({ ...data, instagramShop: { ...data.instagramShop, activo: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Habilitar Instagram Shop</span>
          </label>
          <input
            type="text"
            value={data.instagramShop.businessId}
            onChange={(e) => setData({ ...data, instagramShop: { ...data.instagramShop, businessId: e.target.value } })}
            placeholder="Business ID"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            value={data.instagramShop.token}
            onChange={(e) => setData({ ...data, instagramShop: { ...data.instagramShop, token: e.target.value } })}
            placeholder="Access Token"
            rows={2}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono text-xs"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">🎵 TikTok Shop</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.tiktokShop.activo}
              onChange={(e) => setData({ ...data, tiktokShop: { ...data.tiktokShop, activo: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Habilitar TikTok Shop</span>
          </label>
          <input
            type="text"
            value={data.tiktokShop.shopId}
            onChange={(e) => setData({ ...data, tiktokShop: { ...data.tiktokShop, shopId: e.target.value } })}
            placeholder="Shop ID"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            value={data.tiktokShop.token}
            onChange={(e) => setData({ ...data, tiktokShop: { ...data.tiktokShop, token: e.target.value } })}
            placeholder="Access Token"
            rows={2}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono text-xs"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">🔍 Google Ads</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.googleAds.activo}
              onChange={(e) => setData({ ...data, googleAds: { ...data.googleAds, activo: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Habilitar Google Ads automáticos</span>
          </label>
          <input type="text" value={data.googleAds.clientId} onChange={(e) => setData({ ...data, googleAds: { ...data.googleAds, clientId: e.target.value } })} placeholder="Client ID" className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
          <textarea value={data.googleAds.accessToken} onChange={(e) => setData({ ...data, googleAds: { ...data.googleAds, accessToken: e.target.value } })} placeholder="Access Token" rows={2} className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono text-xs" />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">📧 Mailchimp</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.mailchimp.activo}
              onChange={(e) => setData({ ...data, mailchimp: { ...data.mailchimp, activo: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Habilitar Mailchimp</span>
          </label>
          <input type="password" value={data.mailchimp.apiKey} onChange={(e) => setData({ ...data, mailchimp: { ...data.mailchimp, apiKey: e.target.value } })} placeholder="API Key" className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono" />
          <input type="text" value={data.mailchimp.listId} onChange={(e) => setData({ ...data, mailchimp: { ...data.mailchimp, listId: e.target.value } })} placeholder="List ID" className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">💬 Slack</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.slack.activo}
              onChange={(e) => setData({ ...data, slack: { ...data.slack, activo: e.target.checked } })}
              className="h-4 w-4"
            />
            <span className="text-sm">Notificar pedidos en Slack</span>
          </label>
          <textarea value={data.slack.webhookUrl} onChange={(e) => setData({ ...data, slack: { ...data.slack, webhookUrl: e.target.value } })} placeholder="Webhook URL" rows={2} className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono text-xs" />
        </div>
      </section>

      <button onClick={guardar} disabled={saving} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar integraciones'}
      </button>
    </div>
  );
}
