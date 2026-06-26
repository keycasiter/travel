package migration

import (
	"fmt"
	"net/url"
	"strings"
)

func DatabaseURL(mysqlDSN string) (string, error) {
	mysqlDSN = strings.TrimSpace(mysqlDSN)
	if mysqlDSN == "" {
		return "", fmt.Errorf("MYSQL_DSN is required")
	}
	base, rawQuery, hasQuery := strings.Cut(mysqlDSN, "?")
	query := url.Values{}
	if hasQuery {
		parsed, err := url.ParseQuery(rawQuery)
		if err != nil {
			return "", fmt.Errorf("parse MYSQL_DSN query: %w", err)
		}
		query = parsed
	}
	query.Set("multiStatements", "true")
	return "mysql://" + base + "?" + query.Encode(), nil
}
