"""
TDD Suite — Zero-Cost Nginx Cache & Official Elephant-Goldfish Model (EGM) Integration under Codework.
Valida los 5 Criterios de Aceptación (CA-1 a CA-5):
CA-1: Zona TEC360_CACHE en Nginx y volumen docker persistente nginx_cache.
CA-2: Mapas de bypass estricto para Authorization, cookies de sesión y rutas privadas.
CA-3: Microcaching de catálogo (30s), landing (10m), estáticos inmutables y preservación de security headers.
CA-4: Instalación íntegra del plugin oficial google/elephant-goldfish-model (v0.1.1).
CA-5: Persona egm-brand-visual, estándar tec360-brand-standard.md e integración en brandingwork.
"""
import json
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_ca1_nginx_cache_zone_and_docker_compose_volume():
    """CA-1: Declaración de proxy_cache_path con RSC key y volumen nginx_cache."""
    nginx_conf = (ROOT_DIR / "nginx" / "nginx.conf").read_text(encoding="utf-8")
    compose_prod = (ROOT_DIR / "docker-compose.prod.yml").read_text(encoding="utf-8")

    # Directivas de zona en Nginx
    assert "proxy_cache_path /var/cache/nginx" in nginx_conf
    assert "keys_zone=TEC360_CACHE:10m" in nginx_conf
    assert "max_size=1g" in nginx_conf
    assert "inactive=60m" in nginx_conf
    assert "use_temp_path=off" in nginx_conf

    # Clave de caché RSC-Aware para Next.js 15
    assert 'proxy_cache_key "$scheme$request_method$host$request_uri$http_rsc"' in nginx_conf

    # Volumen persistente en docker-compose.prod.yml
    assert "nginx_cache:/var/cache/nginx" in compose_prod
    assert "nginx_cache:" in compose_prod.split("volumes:")[-1]


def test_ca2_nginx_strict_session_and_private_route_bypass_maps():
    """CA-2: Mapeos para omitir caché en sesiones autenticadas, tokens y rutas privadas."""
    nginx_conf = (ROOT_DIR / "nginx" / "nginx.conf").read_text(encoding="utf-8")

    # Mapeo de cabecera Authorization
    assert "map $http_authorization $auth_bypass" in nginx_conf
    # Mapeo de cookies de sesión
    assert "map $http_cookie $cookie_bypass" in nginx_conf
    # Mapeo de rutas privadas (admin, tecnico, taller, servicios, perfil, auth, etc.)
    assert "map $request_uri $uri_bypass" in nginx_conf
    assert "admin|tecnico|taller|servicios|perfil|vehiculos|auth|register" in nginx_conf
    # Mapeo unificado $skip_cache
    assert "map \"$auth_bypass:$cookie_bypass:$uri_bypass\" $skip_cache" in nginx_conf


def test_ca3_nginx_locations_microcaching_and_security_headers():
    """CA-3: Microcaching de catálogo, landing page, assets estáticos y preservación de cabeceras."""
    nginx_conf = (ROOT_DIR / "nginx" / "nginx.conf").read_text(encoding="utf-8")

    # Microcaching en endpoints públicos (/api/organizations/public-list y /api/courses)
    assert "location ~ ^/api/(organizations/public-list|courses)" in nginx_conf
    assert "proxy_cache_valid 200 30s" in nginx_conf

    # Landing Page y Vistas Públicas en location /
    assert "proxy_cache TEC360_CACHE" in nginx_conf
    assert "proxy_cache_valid 200 10m" in nginx_conf
    assert "proxy_cache_use_stale" in nginx_conf
    assert "proxy_cache_background_update on" in nginx_conf
    assert "proxy_cache_lock on" in nginx_conf
    assert "add_header X-Cache-Status $upstream_cache_status always;" in nginx_conf

    # Next.js Static Assets
    assert "max-age=31536000, immutable" in nginx_conf

    # Uploads
    assert "etag on;" in nginx_conf
    assert "stale-while-revalidate=43200" in nginx_conf

    # Service Worker nunca en caché
    assert "proxy_no_cache 1;" in nginx_conf
    assert "proxy_cache_bypass 1;" in nginx_conf
    assert "no-cache, no-store, must-revalidate" in nginx_conf

    # Preservación de cabeceras de seguridad dentro de bloques con add_header
    assert 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' in nginx_conf
    assert 'add_header X-Frame-Options "SAMEORIGIN" always;' in nginx_conf
    assert 'add_header X-Content-Type-Options "nosniff" always;' in nginx_conf


def test_ca4_official_egm_plugin_installation():
    """CA-4: Existencia e integridad del plugin oficial google/elephant-goldfish-model (v0.1.1)."""
    workspace_plugin_dir = ROOT_DIR / ".agents" / "plugins" / "egm"
    global_plugin_dir = Path.home() / ".gemini" / "config" / "plugins" / "egm"

    assert workspace_plugin_dir.exists(), "El plugin oficial no está copiado en .agents/plugins/egm"
    assert (workspace_plugin_dir / "plugin.json").exists()

    manifest = json.loads((workspace_plugin_dir / "plugin.json").read_text(encoding="utf-8"))
    assert manifest.get("name") == "egm"
    assert manifest.get("version") == "0.1.1"

    # Verificar 7 skills oficiales en el plugin
    expected_skills = [
        "egm-brainstorm",
        "egm-draft",
        "egm-review",
        "egm-review-loop",
        "egm-resolve",
        "egm-drift-report",
        "egm-bootstrap",
    ]
    for skill_name in expected_skills:
        skill_file = workspace_plugin_dir / "skills" / skill_name / "SKILL.md"
        assert skill_file.exists(), f"Skill {skill_name} falta en el plugin oficial"

    # Verificar agentes oficiales
    expected_agents = [
        "synthesizer.md",
        "design_critic.md",
        "structural.md",
        "style.md",
        "comprehension.md",
        "implementation_readiness.md",
        "zoom_out.md",
        "codebase_details.md",
        "inventive_catalyst.md",
    ]
    for agent_file in expected_agents:
        assert (workspace_plugin_dir / "agents" / agent_file).exists(), f"Agente {agent_file} falta en agents/"

    # Verificar presencia en la configuración global de Antigravity
    assert global_plugin_dir.exists(), "El plugin egm no está instalado en ~/.gemini/config/plugins/egm"
    assert (global_plugin_dir / "plugin.json").exists()


def test_ca5_tec360_brand_visual_critic_and_brandingwork_integration():
    """CA-5: Persona egm-brand-visual, estándar tec360-brand-standard y pipeline brandingwork."""
    workspace_plugin_dir = ROOT_DIR / ".agents" / "plugins" / "egm"
    brandingwork_skill = (ROOT_DIR / ".agents" / "skills" / "brandingwork" / "SKILL.md").read_text(encoding="utf-8")
    brandingwork_rule = (ROOT_DIR / ".agents" / "rules" / "brandingwork.md").read_text(encoding="utf-8")

    # Persona Goldfish para Tec360
    critic_agent = workspace_plugin_dir / "agents" / "brand_visual_critic.md"
    assert critic_agent.exists(), "Falta brand_visual_critic.md en agents/"
    critic_content = critic_agent.read_text(encoding="utf-8")
    assert "name: egm-brand-visual" in critic_content
    assert "Strict Read-Only Protocol" in critic_content
    assert "Stateless Mindset" in critic_content

    # Estándar oficial de marca Tec360
    brand_standard = workspace_plugin_dir / "resources" / "document_standards" / "tec360-brand-standard.md"
    assert brand_standard.exists(), "Falta tec360-brand-standard.md en document_standards/"
    std_content = brand_standard.read_text(encoding="utf-8")
    assert "Rule 1: Logo Integrity" in std_content
    assert "Rule 2: WCAG 2.2 AA Contrast" in std_content
    assert "Rule 3: Three-Voice Typography" in std_content
    assert "Rule 4: Spatial Grid & Three Service Lines" in std_content

    # Integración en SKILL.md de brandingwork
    assert "egm-review-loop" in brandingwork_skill
    assert "egm-resolve" in brandingwork_skill
    assert "egm-drift-report" in brandingwork_skill
    assert "egm-brand-visual" in brandingwork_skill

    # Integración en regla brandingwork.md
    assert "egm-review-loop" in brandingwork_rule
    assert "egm-drift-report" in brandingwork_rule
