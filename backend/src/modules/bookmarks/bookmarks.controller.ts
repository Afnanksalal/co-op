import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto, UpdateBookmarkDto, BookmarkResponseDto } from './dto/bookmark.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';

@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'bookmarks:create' })
  @ApiOperation({ summary: 'Create a bookmark' })
  @ApiResponse({ status: 201, description: 'Bookmark created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBookmarkDto,
  ): Promise<ApiResponseDto<BookmarkResponseDto>> {
    const bookmark = await this.bookmarksService.create(user.id, dto);
    return ApiResponseDto.success(bookmark, 'Bookmark created');
  }

  @Get()
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get all bookmarks' })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Bookmarks retrieved' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
  ): Promise<ApiResponseDto<BookmarkResponseDto[]>> {
    const bookmarks = await this.bookmarksService.findAll(user.id, search);
    return ApiResponseDto.success(bookmarks);
  }

  @Get(':id')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get bookmark by ID' })
  @ApiResponse({ status: 200, description: 'Bookmark found' })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<BookmarkResponseDto>> {
    const bookmark = await this.bookmarksService.findById(id, user.id);
    return ApiResponseDto.success(bookmark);
  }

  @Patch(':id')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'bookmarks:update' })
  @ApiOperation({ summary: 'Update bookmark' })
  @ApiResponse({ status: 200, description: 'Bookmark updated' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookmarkDto,
  ): Promise<ApiResponseDto<BookmarkResponseDto>> {
    const bookmark = await this.bookmarksService.update(id, user.id, dto);
    return ApiResponseDto.success(bookmark, 'Bookmark updated');
  }

  @Delete(':id')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'bookmarks:delete' })
  @ApiOperation({ summary: 'Delete bookmark' })
  @ApiResponse({ status: 200, description: 'Bookmark deleted' })
  async delete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.bookmarksService.delete(id, user.id);
    return ApiResponseDto.message('Bookmark deleted');
  }
}
