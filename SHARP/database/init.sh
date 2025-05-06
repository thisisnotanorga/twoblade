#!/bin/bash

echo "What is your domain name? (e.g., twoblade.com)"
read DOMAIN

# Create .env file
cat > "../.env" << EOF
DOMAIN_NAME=${DOMAIN}
DATABASE_URL=postgres://postgres:REPLACE_ME@localhost:5432/postgres
SHARP_PORT=5000
EOF

echo "Created .env"
echo ""
echo "To setup your server:"
echo "1. Start the database:"
echo "   docker compose up -d"
echo ""
echo "2. Initialize the database schema:"
echo "   docker exec -i postgres-db psql -U postgres < init.sql"
echo ""
echo "4. Start the SHARP server:"
echo "   bun main.js"