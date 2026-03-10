import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    title: string;
    description?: string;
    priority?: any;
    assigneeId?: string;
    creatorId: string;
    dueDate?: string;
    tags?: string[];
  }) {
    return this.prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: { assignee: { select: { firstName: true, lastName: true } } },
    });
  }

  async list(filters?: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.task.findMany({
      where,
      include: { assignee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    });
  }

  async getById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { firstName: true, lastName: true } } },
    });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async update(id: string, data: Record<string, any>) {
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.status === "DONE") data.completedAt = new Date();
    return this.prisma.task.update({
      where: { id },
      data,
      include: { assignee: { select: { firstName: true, lastName: true } } },
    });
  }

  async delete(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }

  async getKanbanBoard() {
    const tasks = await this.prisma.task.findMany({
      include: { assignee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return {
      TODO: tasks.filter((t) => t.status === "TODO"),
      IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
      IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW"),
      DONE: tasks.filter((t) => t.status === "DONE"),
    };
  }

  async getMyTasks(employeeId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: employeeId, status: { not: "DONE" } },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    });
  }
}
