import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { TaskService } from "./task.service";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";

@Controller("tasks")
export class TaskController {
  constructor(private svc: TaskService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create({ ...body, creatorId: user.id });
  }

  @Get()
  list(
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("search") search?: string,
  ) {
    return this.svc.list({ status, priority, assigneeId, search });
  }

  @Get("kanban")
  kanban() {
    return this.svc.getKanbanBoard();
  }

  @Get("my/:employeeId")
  myTasks(@Param("employeeId") employeeId: string) {
    return this.svc.getMyTasks(employeeId);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(":id")
  @Roles("ADMIN")
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}
