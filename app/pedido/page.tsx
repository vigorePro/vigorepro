# Substitua TOKEN pelo seu GitHub Personal Access Token
curl -X PUT \
  -H "Authorization: token SEU_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/vigorePro/vigorepro/contents/app/pedido/page.tsx \
  -d '{
    "message": "fix: corrige JSX malformado e tipagem do insert em pedido",
    "content": "'"$(base64 -i /caminho/para/arquivo_corrigido.tsx)"'",
    "sha": "'"$(curl -s -H 'Authorization: token SEU_TOKEN' https://api.github.com/repos/vigorePro/vigorepro/contents/app/pedido/page.tsx | python3 -c 'import sys,json; print(json.load(sys.stdin)["sha"])')"'"
  }'
