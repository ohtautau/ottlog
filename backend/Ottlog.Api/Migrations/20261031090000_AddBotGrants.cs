using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ottlog.Api.Migrations;

public partial class AddBotGrants : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "BotGrants",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                Owner = table.Column<string>(type: "TEXT", nullable: false),
                Name = table.Column<string>(type: "TEXT", nullable: false),
                TokenHash = table.Column<string>(type: "TEXT", nullable: false),
                SecurityStamp = table.Column<string>(type: "TEXT", nullable: false),
                CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                RevokedAt = table.Column<long>(type: "INTEGER", nullable: true)
            },
            constraints: table => table.PrimaryKey("PK_BotGrants", x => x.Id));
        migrationBuilder.CreateIndex(name: "IX_BotGrants_Owner", table: "BotGrants", column: "Owner");
        migrationBuilder.CreateIndex(name: "IX_BotGrants_TokenHash", table: "BotGrants", column: "TokenHash", unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "BotGrants");
}
