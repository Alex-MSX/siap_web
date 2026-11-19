<#
  SIAP web · Envío de clientes a la nube

  Toma de MySQL local los clientes modificados desde el último envío y los
  manda a la API de la web (api_web/clientes.php) en paquetes de 200.

  - La marca ("hasta dónde ya mandé") vive en la tabla `sincronizacion` de
    MySQL local. Solo avanza cuando la API confirma el paquete.
  - Si la API rechaza algún cliente por datos malos, se anota en el log y se
    sigue (el cliente se vuelve a mandar solo cuando alguien lo corrija).
  - Si se cae el internet o falla la web, no avanza la marca y termina:
    la siguiente vuelta reintenta desde el mismo punto.

  Lo corre el Programador de tareas de Windows cada pocos minutos.
  La configuración (con contraseñas) está en config.json, junto a este
  archivo. config.json NUNCA se sube a GitHub.
#>

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$TAM_PAQUETE  = 200   # clientes por paquete (la API acepta hasta 200)
$MAX_PAQUETES = 100   # tope de paquetes por vuelta (20,000 clientes)
$MARGEN_SEG   = 5     # no toma cambios de los últimos segundos (ver nota en la consulta)

$carpeta = $PSScriptRoot

# ---------------------------------------------------------------------------
# Log mensual: logs\clientes_AAAA-MM.log
# ---------------------------------------------------------------------------
$carpetaLogs = Join-Path $carpeta 'logs'
if (-not (Test-Path $carpetaLogs)) { New-Item -ItemType Directory -Path $carpetaLogs | Out-Null }
$archivoLog = Join-Path $carpetaLogs ('clientes_{0:yyyy-MM}.log' -f (Get-Date))

function Anotar([string]$mensaje) {
    $renglon = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $mensaje
    Add-Content -Path $archivoLog -Value $renglon -Encoding UTF8
    Write-Host $renglon
}

# ---------------------------------------------------------------------------
# Una sola copia a la vez (por si alguien lo corre a mano mientras corre la tarea)
# ---------------------------------------------------------------------------
$candado = New-Object System.Threading.Mutex($false, 'Global\SIAP_Sync_Clientes')
$tengoCandado = $false
try { $tengoCandado = $candado.WaitOne(0) }
catch [System.Threading.AbandonedMutexException] { $tengoCandado = $true }
if (-not $tengoCandado) {
    Write-Host 'Ya hay otra copia corriendo; esta termina sin hacer nada.'
    exit 0
}

# ---------------------------------------------------------------------------
# Configuración y conector de MySQL
# ---------------------------------------------------------------------------
try {
    $cfg = Get-Content -Path (Join-Path $carpeta 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    [void][Reflection.Assembly]::LoadFrom($cfg.mysql_dll)

    $csb = New-Object MySql.Data.MySqlClient.MySqlConnectionStringBuilder
    $csb.Server       = $cfg.mysql_servidor
    $csb.Port         = [uint32]$cfg.mysql_puerto
    $csb.Database     = $cfg.mysql_base
    $csb.UserID       = $cfg.mysql_usuario
    $csb.Password     = $cfg.mysql_contrasena
    $csb.CharacterSet = 'utf8mb4'

    $cn = New-Object MySql.Data.MySqlClient.MySqlConnection($csb.ConnectionString)
    $cn.Open()
}
catch {
    Anotar "ERROR al preparar (configuración o conexión a MySQL local): $($_.Exception.Message)"
    exit 1
}

# ---------------------------------------------------------------------------
# Funciones de la marca
# ---------------------------------------------------------------------------
function Leer-Marca {
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = "SELECT DATE_FORMAT(ultima_fecha, '%Y-%m-%d %H:%i:%s'), ultimo_id
                        FROM sincronizacion WHERE tabla = 'clientes'"
    $r = $cmd.ExecuteReader()
    try {
        if (-not $r.Read()) { throw "No existe el renglón 'clientes' en la tabla sincronizacion" }
        return @($r.GetString(0), [int]$r.GetValue(1))
    }
    finally { $r.Close() }
}

function Guardar-Estado($fecha, $id, [string]$resultado) {
    $cmd = $cn.CreateCommand()
    if ($fecha) {
        $cmd.CommandText = "UPDATE sincronizacion
                            SET ultima_fecha = @f, ultimo_id = @id,
                                ultima_revision = NOW(), ultimo_resultado = @r
                            WHERE tabla = 'clientes'"
        [void]$cmd.Parameters.AddWithValue('@f', $fecha)
        [void]$cmd.Parameters.AddWithValue('@id', $id)
    }
    else {
        $cmd.CommandText = "UPDATE sincronizacion
                            SET ultima_revision = NOW(), ultimo_resultado = @r
                            WHERE tabla = 'clientes'"
    }
    if ($resultado.Length -gt 255) { $resultado = $resultado.Substring(0, 255) }
    [void]$cmd.Parameters.AddWithValue('@r', $resultado)
    [void]$cmd.ExecuteNonQuery()
}

# ---------------------------------------------------------------------------
# Consulta de clientes modificados
#
# Se ordena por (fecha_modificacion, id_cliente) y se avanza la marca con los
# dos valores, para no perder ni repetir clientes con la misma fecha.
# No se toman cambios de los últimos segundos: un cliente que se modifica
# "en este mismo segundo" se toma en la siguiente vuelta, nunca se pierde.
# Las fechas salen ya como texto para mandarlas tal cual a la API.
# ---------------------------------------------------------------------------
$sqlClientes = "
    SELECT id_cliente, persona, nombre, paterno, materno, razon_social,
           DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d')        AS fecha_nacimiento,
           genero, rfc, curp, id_grupo, id_ejecutivo, id_usuario, estatus,
           DATE_FORMAT(fecha_creacion, '%Y-%m-%d %H:%i:%s')  AS fecha_creacion,
           DATE_FORMAT(fecha_modificacion, '%Y-%m-%d %H:%i:%s') AS fm
    FROM clientes
    WHERE (fecha_modificacion > @f OR (fecha_modificacion = @f AND id_cliente > @id))
      AND fecha_modificacion < NOW() - INTERVAL $MARGEN_SEG SECOND
    ORDER BY fecha_modificacion, id_cliente
    LIMIT $TAM_PAQUETE"

$campos = 'id_cliente','persona','nombre','paterno','materno','razon_social',
          'fecha_nacimiento','genero','rfc','curp','id_grupo','id_ejecutivo',
          'id_usuario','estatus','fecha_creacion'

# ---------------------------------------------------------------------------
# Vuelta principal
# ---------------------------------------------------------------------------
$enviados   = 0
$rechazados = 0
$paquetes   = 0

try {
    $marca  = Leer-Marca
    $marcaF = $marca[0]
    $marcaI = $marca[1]

    while ($paquetes -lt $MAX_PAQUETES) {

        # 1. Leer el siguiente paquete de MySQL local
        $cmd = $cn.CreateCommand()
        $cmd.CommandText = $sqlClientes
        [void]$cmd.Parameters.AddWithValue('@f', $marcaF)
        [void]$cmd.Parameters.AddWithValue('@id', $marcaI)

        $lista  = New-Object System.Collections.Generic.List[object]
        $ultF   = $null
        $ultI   = $null
        $r = $cmd.ExecuteReader()
        try {
            while ($r.Read()) {
                $c = [ordered]@{}
                foreach ($campo in $campos) {
                    $i = $r.GetOrdinal($campo)
                    $c[$campo] = if ($r.IsDBNull($i)) { $null } else { $r.GetValue($i) }
                }
                $lista.Add($c)
                $ultF = $r.GetString($r.GetOrdinal('fm'))
                $ultI = [int]$r.GetValue($r.GetOrdinal('id_cliente'))
            }
        }
        finally { $r.Close() }

        if ($lista.Count -eq 0) { break }

        # 2. Mandarlo a la API
        $json  = ConvertTo-Json -InputObject @{ clientes = $lista.ToArray() } -Depth 4 -Compress
        $bytes = [Text.Encoding]::UTF8.GetBytes($json)
        $encabezados = @{ Authorization = "Bearer $($cfg.api_clave)" }

        try {
            $resp = Invoke-WebRequest -Uri $cfg.api_url -Method Post -Headers $encabezados `
                        -Body $bytes -ContentType 'application/json; charset=utf-8' `
                        -UseBasicParsing -TimeoutSec 120
        }
        catch {
            $codigo  = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'sin respuesta' }
            $detalle = if ($_.ErrorDetails) { $_.ErrorDetails.Message } else { $_.Exception.Message }
            throw "La API contestó $codigo : $detalle"
        }

        $res = $resp.Content | ConvertFrom-Json
        if ($res.ok -ne $true) { throw "Respuesta inesperada de la API: $($resp.Content)" }

        # 3. Anotar rechazados (no detienen el envío)
        foreach ($x in $res.rechazados) {
            Anotar "RECHAZADO cliente $($x.id_cliente): $($x.motivo)"
            $rechazados++
        }

        # 4. La API confirmó: avanzar la marca
        $enviados += [int]$res.guardados
        $paquetes++
        $marcaF = $ultF
        $marcaI = $ultI
        Guardar-Estado $marcaF $marcaI ("OK: paquete $paquetes, $enviados guardados, $rechazados rechazados")

        if ($lista.Count -lt $TAM_PAQUETE) { break }
    }

    if ($paquetes -eq 0) {
        Guardar-Estado $null $null 'OK: sin cambios'
    }
    else {
        Anotar "OK: $paquetes paquete(s), $enviados guardados, $rechazados rechazados. Marca: $marcaF / $marcaI"
    }
    $codigoSalida = 0
}
catch {
    $msg = $_.Exception.Message
    Anotar "ERROR (se reintenta en la siguiente vuelta; la marca no avanzó en el paquete fallido): $msg"
    try { Guardar-Estado $null $null "ERROR: $msg" } catch { }
    $codigoSalida = 1
}
finally {
    if ($cn) { $cn.Close() }
    $candado.ReleaseMutex()
}

exit $codigoSalida
