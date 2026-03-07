package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	JWT      JWTConfig      `yaml:"jwt"`
}

type ServerConfig struct {
	Port string `yaml:"port"`
	Mode string `yaml:"mode"` // debug, release
}

type DatabaseConfig struct {
	Driver string `yaml:"driver"` // sqlite, postgres
	DSN    string `yaml:"dsn"`
}

type JWTConfig struct {
	Secret     string `yaml:"secret"`
	ExpireHour int    `yaml:"expire_hour"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		// Return default config if file not found
		return DefaultConfig(), nil
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port: "8080",
			Mode: "debug",
		},
		Database: DatabaseConfig{
			Driver: "sqlite",
			DSN:    "life-station.db",
		},
		JWT: JWTConfig{
			Secret:     "change-me-in-production",
			ExpireHour: 72,
		},
	}
}
