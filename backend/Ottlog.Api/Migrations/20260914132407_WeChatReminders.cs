using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ottlog.Api.Migrations
{
    /// <inheritdoc />
    public partial class WeChatReminders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WeChatBindings",
                columns: table => new
                {
                    Owner = table.Column<string>(type: "TEXT", nullable: false),
                    AppId = table.Column<string>(type: "TEXT", nullable: false),
                    OpenId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeChatBindings", x => x.Owner);
                });

            migrationBuilder.CreateTable(
                name: "WeChatReminders",
                columns: table => new
                {
                    Owner = table.Column<string>(type: "TEXT", nullable: false),
                    TaskId = table.Column<string>(type: "TEXT", nullable: false),
                    AppId = table.Column<string>(type: "TEXT", nullable: false),
                    OpenId = table.Column<string>(type: "TEXT", nullable: false),
                    TemplateId = table.Column<string>(type: "TEXT", nullable: false),
                    RemindAtEpoch = table.Column<long>(type: "INTEGER", nullable: false),
                    UpdatedAtEpoch = table.Column<long>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    ErrorCode = table.Column<string>(type: "TEXT", nullable: true),
                    Revision = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeChatReminders", x => new { x.Owner, x.TaskId });
                });

            migrationBuilder.CreateIndex(
                name: "IX_WeChatBindings_AppId_OpenId",
                table: "WeChatBindings",
                columns: new[] { "AppId", "OpenId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeChatReminders_Status_RemindAtEpoch",
                table: "WeChatReminders",
                columns: new[] { "Status", "RemindAtEpoch" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WeChatBindings");

            migrationBuilder.DropTable(
                name: "WeChatReminders");
        }
    }
}
