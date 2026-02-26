"""todo.md 라이터 — 마커 교체, 라인 삭제, 티켓 삽입 (원본 포맷 100% 보존)"""

import asyncio
import re
from pathlib import Path

from backend.domain.ticket import STAGE_TO_MARKER, KanbanStage

# 섹션 헤더 정규식 (## 으로 시작)
_SECTION_RE = re.compile(r"^##\s+")

# 모듈 레벨 파일 쓰기 잠금 (동시 쓰기 방지)
_file_lock = asyncio.Lock()


class TodoWriter:
    """todo.md에 변경사항 기록 (원본 포맷 완벽 보존)"""

    CHECKBOX_RE = re.compile(r"^(\s*- \[)[xX ~QD](\]\s+)")

    async def update_ticket_stage(
        self,
        file_path: str,
        line_number: int,
        new_stage: KanbanStage,
    ) -> None:
        """
        특정 라인의 마커만 교체, 나머지 모든 내용 그대로 보존.

        동시 쓰기 방지를 위해 asyncio.Lock 사용.
        """
        async with _file_lock:
            path = Path(file_path)
            text = path.read_text(encoding="utf-8")
            lines = text.splitlines(keepends=True)

            target_idx = line_number - 1  # 0-based
            if not (0 <= target_idx < len(lines)):
                raise ValueError(
                    f"라인 번호 {line_number}이 파일 범위를 벗어남 "
                    f"(총 {len(lines)}줄)"
                )

            old_line = lines[target_idx]
            new_marker = STAGE_TO_MARKER[new_stage]
            new_line = self.CHECKBOX_RE.sub(
                rf"\g<1>{new_marker}\g<2>",
                old_line,
                count=1,
            )

            if new_line == old_line:
                return  # 변경 없음

            lines[target_idx] = new_line
            path.write_text("".join(lines), encoding="utf-8")

    async def delete_lines(
        self,
        file_path: str,
        line_numbers: list[int],
    ) -> None:
        """
        지정된 라인들을 todo.md에서 삭제.

        line_numbers는 1-based. 복수 라인을 한 번의 파일 쓰기로 처리.
        동시 쓰기 방지를 위해 asyncio.Lock 사용.
        """
        async with _file_lock:
            path = Path(file_path)
            text = path.read_text(encoding="utf-8")
            lines = text.splitlines(keepends=True)

            # 삭제 대상 라인 인덱스 (0-based)
            delete_indices = set(ln - 1 for ln in line_numbers)

            # 범위 검증
            for idx in delete_indices:
                if not (0 <= idx < len(lines)):
                    raise ValueError(
                        f"라인 번호 {idx + 1}이 파일 범위를 벗어남 "
                        f"(총 {len(lines)}줄)"
                    )

            new_lines = [
                line for i, line in enumerate(lines)
                if i not in delete_indices
            ]
            path.write_text("".join(new_lines), encoding="utf-8")

    async def insert_ticket(
        self,
        file_path: str,
        section_line_number: int,
        title: str,
    ) -> None:
        """
        지정 섹션의 마지막 체크박스 뒤에 새 티켓 삽입.

        section_line_number: ## 헤더의 1-based 라인 번호.
        title: 순수 텍스트 (마커 없이).
        삽입 형식: `- [ ] {title}\n`
        """
        async with _file_lock:
            path = Path(file_path)
            text = path.read_text(encoding="utf-8")
            lines = text.splitlines(keepends=True)

            section_idx = section_line_number - 1  # 0-based

            if not (0 <= section_idx < len(lines)):
                raise ValueError(
                    f"섹션 라인 번호 {section_line_number}이 파일 범위를 벗어남 "
                    f"(총 {len(lines)}줄)"
                )

            # 섹션 범위 끝: 다음 ## 헤더 또는 파일 끝
            section_end = len(lines)
            for i in range(section_idx + 1, len(lines)):
                if _SECTION_RE.match(lines[i]):
                    section_end = i
                    break

            # 범위 내 마지막 체크박스 라인 찾기
            last_checkbox_idx = None
            for i in range(section_idx + 1, section_end):
                if self.CHECKBOX_RE.match(lines[i]):
                    last_checkbox_idx = i

            # 삽입 위치: 마지막 체크박스 다음, 없으면 섹션 헤더 다음
            insert_idx = (
                (last_checkbox_idx + 1)
                if last_checkbox_idx is not None
                else (section_idx + 1)
            )

            new_line = f"- [ ] {title}\n"
            lines.insert(insert_idx, new_line)
            path.write_text("".join(lines), encoding="utf-8")

    async def insert_child_ticket(
        self,
        file_path: str,
        parent_line_number: int,
        title: str,
    ) -> None:
        """
        부모 티켓의 마지막 자식 뒤에 들여쓰기된 자식 티켓 삽입.

        parent_line_number: 부모 체크박스의 1-based 라인 번호.
        title: 순수 텍스트 (마커 없이).
        부모 indent + 2spaces 로 삽입하여 파서가 자식으로 인식.
        """
        async with _file_lock:
            path = Path(file_path)
            text = path.read_text(encoding="utf-8")
            lines = text.splitlines(keepends=True)

            parent_idx = parent_line_number - 1  # 0-based

            if not (0 <= parent_idx < len(lines)):
                raise ValueError(
                    f"부모 라인 번호 {parent_line_number}이 파일 범위를 벗어남 "
                    f"(총 {len(lines)}줄)"
                )

            # 부모의 indent 감지
            parent_match = self.CHECKBOX_RE.match(lines[parent_idx])
            parent_indent = len(parent_match.group(1).split("- [")[0]) if parent_match else 0
            child_indent = parent_indent + 2  # 2spaces per level

            # 부모 이후 연속 자식(indent > parent_indent인 체크박스) 끝 찾기
            insert_idx = parent_idx + 1
            for i in range(parent_idx + 1, len(lines)):
                m = self.CHECKBOX_RE.match(lines[i])
                if m:
                    line_indent = len(m.group(1).split("- [")[0])
                    if line_indent > parent_indent:
                        insert_idx = i + 1
                    else:
                        break
                else:
                    # 체크박스가 아닌 라인 → 자식 블록 끝
                    break

            new_line = f"{' ' * child_indent}- [ ] {title}\n"
            lines.insert(insert_idx, new_line)
            path.write_text("".join(lines), encoding="utf-8")
