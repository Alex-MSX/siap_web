-- Reporte de huérfanos de pólizas (MySQL local). Cambiar `siap` por `siap_prueba` para la base de prueba.
-- Un solo renglón con los conteos. Desde el 21/11/2026 las claves se identifican con clave + aseguradora.
SELECT
  COUNT(*)                                   AS total,
  SUM(p.id_plan IS NULL)                     AS sin_plan,
  SUM(p.id_direccion_riesgo IS NULL)         AS sin_direccion,
  SUM(p.id_poliza_anterior IS NULL)          AS sin_anterior,      -- normal en pólizas nuevas
  SUM(c.clave IS NULL)                       AS clave_no_existe_en_su_aseguradora,
  SUM(pl.id_plan IS NOT NULL AND pl.id_aseguradora <> p.id_aseguradora) AS plan_otra_aseguradora,
  SUM(e.id_ejecutivo IS NULL)                AS ejecutivo_no_existe,
  SUM(v.id_vendedor IS NULL)                 AS vendedor_no_existe,
  SUM(m.id_moneda IS NULL)                   AS moneda_no_existe,
  SUM(f.id_forma_pago IS NULL)               AS forma_pago_no_existe,
  SUM(p.hasta < p.desde)                     AS vigencia_al_reves
FROM siap.polizas p
LEFT JOIN siap.claves c       ON c.clave = p.clave AND c.id_aseguradora = p.id_aseguradora
LEFT JOIN siap.planes pl      ON pl.id_plan = p.id_plan
LEFT JOIN siap.ejecutivos e   ON e.id_ejecutivo = p.id_ejecutivo
LEFT JOIN siap.vendedores v   ON v.id_vendedor = p.id_vendedor
LEFT JOIN siap.monedas m      ON m.id_moneda = p.id_moneda
LEFT JOIN siap.formas_pago f  ON f.id_forma_pago = p.id_forma_pago;
