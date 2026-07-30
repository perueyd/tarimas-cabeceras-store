import { useState } from 'react';

export default function SecurityTab({ catalog, api, flash }) {
  const cfg = catalog.storeConfig || {};
  const security = cfg.security || {};
  const [data, setData] = useState({
    twoFactorActivo: security.twoFactorActivo || false,
    twoFactorTipo: security.twoFactorTipo || 'google',
    auditLogActivo: security.auditLogActivo !== false,
    backupAutomaticoActivo: security.backupAutomaticoActivo !== false,
    backupFrecuencia: security.backupFrecuencia || 'diaria',
    encriptacionActiva: security.encriptacionActiva !== false,
    rateLimitingActivo: security.rateLimitingActivo !== false,
    rateLimitPorIP: security.rateLimitPorIP || 100,
    ddosProtectionActivo: security.ddosProtectionActivo || false,
    passwordMinChars: security.passwordMinChars || 8,
    passwordRequeridoNumeros: security.passwordRequeridoNumeros !== false,
    passwordRequeridoEspeciales: security.passwordRequeridoEspeciales !== false,
  });
  const [saving, setSaving] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(false);

  async function guardar() {
    setSaving(true);
    try {
      await api('POST', 'config', { security: data });
      flash('Seguridad actualizada.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
        🔒 Protección de datos: 2FA, auditoría, backups automáticos y encriptación.
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Autenticación de 2 Factores</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.twoFactorActivo}
              onChange={(e) => setData({ ...data, twoFactorActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🔐 Habilitar 2FA (autenticador)</span>
          </label>
          {data.twoFactorActivo && (
            <div className="space-y-2 rounded-lg bg-neutral-50 p-3">
              <label className="block text-xs">
                <span className="text-neutral-600">Tipo de 2FA</span>
                <select
                  value={data.twoFactorTipo}
                  onChange={(e) => setData({ ...data, twoFactorTipo: e.target.value })}
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="google">Google Authenticator</option>
                  <option value="microsoft">Microsoft Authenticator</option>
                  <option value="authy">Authy</option>
                  <option value="sms">SMS (código por texto)</option>
                </select>
              </label>
              <button
                onClick={() => setTwoFactorSetup(!twoFactorSetup)}
                className="text-xs text-blue-600 hover:underline"
              >
                {twoFactorSetup ? '✓ Configurar 2FA' : 'Ver instrucciones de setup'}
              </button>
              {twoFactorSetup && (
                <div className="rounded bg-blue-50 p-2 text-xs text-blue-900">
                  <p className="font-medium">Pasos:</p>
                  <ol className="mt-1 list-inside space-y-1">
                    <li>1. Descarga Google Authenticator en tu teléfono</li>
                    <li>2. Abre la app y escanea el código QR</li>
                    <li>3. Ingresa el código de 6 dígitos aquí</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Auditoría y Logs</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.auditLogActivo}
              onChange={(e) => setData({ ...data, auditLogActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">📋 Registrar quién accede qué y cuándo</span>
          </label>
          <p className="text-xs text-neutral-600">
            Se registra: usuario, acción, IP, hora, cambios realizados. Útil para investigar incidentes.
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Backups Automáticos</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.backupAutomaticoActivo}
              onChange={(e) => setData({ ...data, backupAutomaticoActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">💾 Backup automático de datos</span>
          </label>
          <label className="block text-xs">
            <span className="text-neutral-600">Frecuencia de backup</span>
            <select
              value={data.backupFrecuencia}
              onChange={(e) => setData({ ...data, backupFrecuencia: e.target.value })}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="cada6h">Cada 6 horas</option>
              <option value="diaria">Diaria (00:00 GMT)</option>
              <option value="semanal">Semanal (domingo)</option>
              <option value="manual">Manual (bajo demanda)</option>
            </select>
          </label>
          <p className="text-xs text-neutral-600">
            ✅ Los backups se guardan en almacenamiento seguro (AWS S3).
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Encriptación</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.encriptacionActiva}
              onChange={(e) => setData({ ...data, encriptacionActiva: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🔐 Encriptación de datos sensibles (contraseñas, tarjetas)</span>
          </label>
          <p className="text-xs text-neutral-600">
            AES-256 en reposo. TLS 1.3 en tránsito. Cumple GDPR/CCPA.
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Rate Limiting y DDoS</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.rateLimitingActivo}
              onChange={(e) => setData({ ...data, rateLimitingActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">⚡ Rate limiting (máx peticiones por IP)</span>
          </label>
          {data.rateLimitingActivo && (
            <label className="block text-xs">
              <span className="text-neutral-600">Peticiones por minuto por IP</span>
              <input
                type="number"
                value={data.rateLimitPorIP}
                onChange={(e) => setData({ ...data, rateLimitPorIP: parseInt(e.target.value) })}
                min="10"
                max="10000"
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
          )}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.ddosProtectionActivo}
              onChange={(e) => setData({ ...data, ddosProtectionActivo: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">🛡️ Protección DDoS (Cloudflare)</span>
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Política de Contraseñas</h3>
        <div className="space-y-3">
          <label className="block text-xs">
            <span className="text-neutral-600">Mínimo de caracteres</span>
            <input
              type="number"
              value={data.passwordMinChars}
              onChange={(e) => setData({ ...data, passwordMinChars: parseInt(e.target.value) })}
              min="6"
              max="20"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.passwordRequeridoNumeros}
              onChange={(e) => setData({ ...data, passwordRequeridoNumeros: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">Requerir números (0-9)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.passwordRequeridoEspeciales}
              onChange={(e) => setData({ ...data, passwordRequeridoEspeciales: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">Requerir caracteres especiales (!@#$%)</span>
          </label>
        </div>
      </section>

      <section className="rounded-lg bg-green-50 p-3">
        <h3 className="mb-2 text-sm font-semibold text-green-900">✅ Estatus de seguridad</h3>
        <ul className="text-xs text-green-800 space-y-1">
          <li>✓ {data.twoFactorActivo ? '2FA habilitado' : '2FA deshabilitado'}</li>
          <li>✓ {data.encriptacionActiva ? 'Encriptación activa' : 'Encriptación desactiva'}</li>
          <li>✓ {data.backupAutomaticoActivo ? 'Backups automáticos' : 'Sin backups automáticos'}</li>
          <li>✓ {data.rateLimitingActivo ? 'Rate limiting activo' : 'Rate limiting desactivo'}</li>
        </ul>
      </section>

      <button onClick={guardar} disabled={saving} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}
