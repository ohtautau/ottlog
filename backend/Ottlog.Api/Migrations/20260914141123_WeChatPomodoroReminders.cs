using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ottlog.Api.Migrations
{
    /// <inheritdoc />
    public partial class WeChatPomodoroReminders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WeChatPomodoroReminders",
                columns: table => new
                {
                    Owner = table.Column<string>(type: "TEXT", nullable: false),
                    RunId = table.Column<string>(type: "TEXT", nullable: false),
                    Event = table.Column<string>(type: "TEXT", nullable: false),
                    AppId = table.Column<string>(type: "TEXT", nullable: false),
                    OpenId = table.Column<string>(type: "TEXT", nullable: false),
                    TemplateId = table.Column<string>(type: "TEXT", nullable: false),
                    RemindAtEpoch = table.Column<long>(type: "INTEGER", nullable: false),
                    SourceDeadline = table.Column<long>(type: "INTEGER", nullable: false),
                    UpdatedAtEpoch = table.Column<long>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    ErrorCode = table.Column<string>(type: "TEXT", nullable: true),
                    Revision = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeChatPomodoroReminders", x => new { x.Owner, x.RunId, x.Event });
                });

            migrationBuilder.CreateIndex(
                name: "IX_WeChatPomodoroReminders_Status_RemindAtEpoch",
                table: "WeChatPomodoroReminders",
                columns: new[] { "Status", "RemindAtEpoch" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WeChatPomodoroReminders");
        }
    }
}
