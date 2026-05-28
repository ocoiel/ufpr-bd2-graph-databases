#!/usr/bin/env bash
# Carrega o dump do ICIJ Offshore Leaks no Neo4j.
# Roda uma vez (após `docker compose up -d` na primeira execução).

set -euo pipefail

DUMP_FILE="icij-offshoreleaks-5.13.0.dump"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_PATH="${PROJECT_DIR}/data/${DUMP_FILE}"

if [[ ! -f "${DUMP_PATH}" ]]; then
  echo "ERRO: dump não encontrado em ${DUMP_PATH}"
  echo "Baixe com: curl -L -o ${DUMP_PATH} https://offshoreleaks-data.icij.org/offshoreleaks/neo4j/icij-offshoreleaks-5.13.0.dump"
  exit 1
fi

# neo4j-admin procura <database-name>.dump no --from-path; default db = "neo4j".
# Criamos um symlink neo4j.dump apontando pro arquivo real.
if [[ ! -e "${PROJECT_DIR}/data/neo4j.dump" ]]; then
  ln -sf "${DUMP_FILE}" "${PROJECT_DIR}/data/neo4j.dump"
fi

echo "==> Parando container neo4j (necessário pra rodar load)..."
docker compose stop neo4j

echo "==> Carregando dump (pode levar alguns minutos)..."
docker compose run --rm --no-deps \
  -v "${PROJECT_DIR}/data:/import:ro" \
  neo4j \
  neo4j-admin database load neo4j \
  --from-path=/import \
  --overwrite-destination=true \
  --verbose

echo "==> Subindo neo4j novamente..."
docker compose start neo4j

echo "==> Aguardando health check..."
until docker compose exec neo4j wget -q --spider http://localhost:7474; do
  printf '.'
  sleep 2
done

echo ""
echo "==> Pronto. Acesse http://localhost:7474"
echo "==> Login: neo4j / panama-papers-2026"
