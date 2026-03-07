package service

import (
	"errors"
	"time"

	"life-station/internal/model"
	"life-station/internal/repository"
	"life-station/pkg/config"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo *repository.UserRepo
	jwtCfg   *config.JWTConfig
}

func NewAuthService(userRepo *repository.UserRepo, jwtCfg *config.JWTConfig) *AuthService {
	return &AuthService{userRepo: userRepo, jwtCfg: jwtCfg}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  *model.User `json:"user"`
}

type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func (s *AuthService) Register(req *RegisterRequest) (*AuthResponse, error) {
	// Check if username exists
	existing, _ := s.userRepo.FindByUsername(req.Username)
	if existing != nil {
		return nil, errors.New("username already exists")
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Username: req.Username,
		Password: string(hashed),
		Nickname: req.Nickname,
	}
	if user.Nickname == "" {
		user.Nickname = req.Username
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) Login(req *LoginRequest) (*AuthResponse, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) generateToken(user *model.User) (string, error) {
	claims := Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.jwtCfg.ExpireHour) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtCfg.Secret))
}

func (s *AuthService) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtCfg.Secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func (s *AuthService) GetUserByID(id uint) (*model.User, error) {
	return s.userRepo.FindByID(id)
}
