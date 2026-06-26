package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Env             string
	HTTPAddr        string
	MySQLDSN        string
	WechatAppID     string
	WechatAppSecret string
}

func Load() Config {
	loadDotEnv(".env")
	loadDotEnv("../../.env")
	return Config{
		Env:             getEnv("APP_ENV", "local"),
		HTTPAddr:        getEnv("HTTP_ADDR", ":8080"),
		MySQLDSN:        getEnv("MYSQL_DSN", ""),
		WechatAppID:     getEnv("WECHAT_APP_ID", ""),
		WechatAppSecret: getEnv("WECHAT_APP_SECRET", ""),
	}
}

func getEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		if os.Getenv(key) != "" {
			continue
		}
		os.Setenv(key, strings.TrimSpace(value))
	}
}
