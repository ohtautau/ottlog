FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/Ottlog.Api/Ottlog.Api.csproj backend/Ottlog.Api/
RUN dotnet restore backend/Ottlog.Api/Ottlog.Api.csproj
COPY backend/Ottlog.Api/ backend/Ottlog.Api/
COPY web/src/lib/unsplash-covers.json web/src/lib/unsplash-covers.json
RUN dotnet publish backend/Ottlog.Api/Ottlog.Api.csproj -c Release --no-restore -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && mkdir /data && chown app:app /data
WORKDIR /app
COPY --from=build /out/ ./
ENV ASPNETCORE_URLS=http://+:8080 ASPNETCORE_ENVIRONMENT=Production Data__Directory=/data
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Ottlog.Api.dll"]
