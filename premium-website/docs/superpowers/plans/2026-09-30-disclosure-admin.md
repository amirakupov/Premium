# Раскрытие информации через админку — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Администратор сам ведёт раздел «Раскрытие информации» (документы
PDF/ссылки, реквизиты, ДМС, контролирующие органы) через админку; витрина
берёт всё с бэкенда, хардкод из `lib/disclosure.ts` и `public/docs/` уходит.

**Architecture:** Бэкенд — четыре JPA-сущности, ручной валидатор, сервис и
отдельный `DisclosureController` под `/api/cms`; PDF грузятся отдельным
эндпоинтом `MediaController` без перекодирования. Админка — экран
`/admin/disclosure` с вкладками на собственном `DisclosureDataProvider`;
PDF идут через стримящий route handler, остальное — server actions с
`revalidateTag`. Витрина — `getDisclosure()` с тегом кеша; страница рендерится
на запрос, данные — из data cache.

**Tech Stack:** Spring Boot 4.0.2, JPA/Hibernate (`ddl-auto: update`),
Lombok, JUnit 5 + Mockito + AssertJ; Next.js 16 (App Router), React 19,
vitest (`environment: "node"`, только `lib/**/*.test.ts`).

**Spec:** `premium-website/docs/superpowers/specs/2026-09-29-disclosure-admin-design.md`

## Global Constraints

- Все пути бэкенда под существующими правилами `SecurityConfig`; новых правил нет. Изменения — только `POST`/`PATCH`/`DELETE`, никакого `PUT`.
- Ссылки (`kind = LINK`, `site` партнёров и органов) — только `https://`.
- `kind = FILE` — `url` строго вида `/uploads/<uuid>.pdf`.
- PDF: расширение `.pdf`, сигнатура `%PDF-` в первых 5 байтах, размер ≤ 30 МБ; `max-file-size: 30MB`, `max-request-size: 32MB`. Лимит картинок 10 МБ остаётся проверкой в коде.
- Реквизиты: ИНН `^\d{10}$`, КПП `^\d{9}$`, ОГРН `^\d{13}$`, пустое значение допустимо.
- Категории врача (`CERTIFICATE`, `DIPLOMA`) на `/documents` не выводятся никогда.
- Обязательные категории раскрытия: `CONTRACT`, `PRICE_LIST`, `LICENSE`, `REGULATION`, `GUARANTEE_PROGRAM`.
- PDF в админке грузятся через route handler, не через server action (лимит `6mb` не поднимаем).
- Сида данных в коде нет. Выкатка в два релиза: задачи 1–11 — релиз 1 (витрина не меняется), задача 12 — релиз 2.
- Тексты интерфейса и сообщения ошибок — по-русски; комментарии в коде — по-русски на фронте, по-английски на бэкенде, как в соседних файлах.

## Review Focus

- Документ врача без врача (или документ клиники с врачом) — бэкенд отвечает 400, документ врача не может «утечь» в раздел раскрытия. Тест — задача 2.
- Файл с расширением `.pdf`, но не PDF (переименованный HTML) — 400, на диск не пишется. Тест — задача 1.
- Бэкенд недоступен при холодном кеше — `getDisclosure()` бросает, страница показывает `error.tsx`, а не пустой раздел. Тест — задача 12.
- Порядок изменился в другой вкладке (удалили документ, пока админ двигал строки) — неполный список на `/order` даёт 400 «Список устарел», админка перезагружает данные. Тест — задача 3, обработка — задача 9.
- ИНН вставлен с пробелами по краям — обрезается и принимается; с пробелами внутри или буквами — понятная ошибка у поля. Тесты — задачи 2 и 5.

---

## Структура файлов

**Бэкенд** (`CMS-premium/src/main/java/com/cms/`):
- `entity/DocumentCategory.java`, `entity/DocumentKind.java` — перечисления.
- `entity/DisclosureDocumentEntity.java`, `entity/ClinicRequisitesEntity.java`, `entity/DmsPartnerEntity.java`, `entity/RegulatorEntity.java`.
- `repo/DisclosureDocumentRepository.java`, `repo/ClinicRequisitesRepository.java`, `repo/DmsPartnerRepository.java`, `repo/RegulatorRepository.java`.
- `dto/DisclosureDocumentRequestDto.java`, `dto/DisclosureDocumentResponseDto.java`, `dto/RequisitesDto.java`, `dto/DmsPartnerDto.java`, `dto/RegulatorDto.java`, `dto/OrderRequestDto.java`, `dto/DisclosureResponseDto.java`.
- `service/DisclosureValidator.java` — чистые проверки, бросают `IllegalArgumentException` (→ 400 через `GlobalExceptionHandler`).
- `service/DisclosureService.java` — вся логика раздела.
- `controller/DisclosureController.java` — тонкий слой HTTP.
- `controller/MediaController.java` — + `uploadDocument`.
- Тесты: `src/test/java/com/cms/controller/MediaControllerDocumentTest.java`, `src/test/java/com/cms/service/DisclosureValidatorTest.java`, `src/test/java/com/cms/service/DisclosureServiceTest.java`.

**Фронт** (`premium-website/`):
- `lib/types.ts` — + типы раздела.
- `lib/disclosure.ts` — + чистые функции (данные удаляются в задаче 12).
- `lib/admin/disclosure.ts` — правила админки (обязательные категории, перестановка, разбор ошибок бэкенда).
- `lib/admin/validation.ts` — + валидация документа, реквизитов, партнёра, органа.
- `lib/admin/draft.ts` — + scope `"document"`.
- `app/api/admin/upload-document/route.ts` — стримящий прокси загрузки.
- `app/(admin)/admin/disclosure/actions.ts` — server actions раздела.
- `app/(admin)/admin/components/data/DisclosureDataProvider.tsx` — состояние раздела.
- `app/(admin)/admin/components/ui/FileDropzone.tsx` (+ `.module.css`).
- `app/(admin)/admin/disclosure/page.tsx` (+ `disclosure.module.css`) — экран с вкладками.
- `app/(admin)/admin/components/DocumentTable.tsx`, `DocumentSheet.tsx`, `RequisitesForm.tsx`, `OrderedListTable.tsx` (+ `Disclosure.module.css`).
- Задача 12: `lib/cms.ts`, `app/(site)/documents/page.tsx`, `app/(site)/documents/error.tsx`, `next.config.ts`, `public/docs/*`.

---

### Task 1: Загрузка PDF на бэкенде

**Files:**
- Modify: `CMS-premium/src/main/java/com/cms/controller/MediaController.java`
- Modify: `CMS-premium/src/main/resources/application.yml:25-28`
- Test: `CMS-premium/src/test/java/com/cms/controller/MediaControllerDocumentTest.java`

**Interfaces:**
- Produces: `POST /api/cms/media/document` (multipart `file`) → `{ "url": "/uploads/<uuid>.pdf", "size": "<байты>" }`; 400 с текстом на пустой файл, не `.pdf`, не-PDF содержимое, > 30 МБ. Java: `public Map<String, String> uploadDocument(MultipartFile file) throws IOException`.

- [ ] **Step 1: Write the failing test**

```java
package com.cms.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MediaControllerDocumentTest {

    @TempDir
    Path uploadDir;

    private MediaController controller;

    @BeforeEach
    void setUp() {
        controller = new MediaController(uploadDir.toString());
    }

    private static MockMultipartFile pdf(String name, String content) {
        return new MockMultipartFile("file", name, "application/pdf",
                content.getBytes(StandardCharsets.ISO_8859_1));
    }

    @Test
    void storesPdfAsIsUnderRandomName() throws Exception {
        String body = "%PDF-1.7\nfake but signed\n%%EOF";
        Map<String, String> result = controller.uploadDocument(pdf("Прейскурант.pdf", body));

        assertThat(result.get("url")).matches("^/uploads/[0-9a-f-]{36}\\.pdf$");
        assertThat(result.get("size")).isEqualTo(String.valueOf(body.length()));
        Path stored = uploadDir.resolve(result.get("url").substring("/uploads/".length()));
        assertThat(Files.readString(stored, StandardCharsets.ISO_8859_1)).isEqualTo(body);
    }

    @Test
    void acceptsUppercaseExtension() throws Exception {
        assertThat(controller.uploadDocument(pdf("LICENSE.PDF", "%PDF-1.4 x")).get("url")).endsWith(".pdf");
    }

    @Test
    void rejectsRenamedHtml() {
        assertThatThrownBy(() -> controller.uploadDocument(pdf("price.pdf", "<html><script>")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("не PDF");
        assertThat(uploadDir.toFile().list()).isEmpty();
    }

    @Test
    void rejectsNonPdfExtension() {
        assertThatThrownBy(() -> controller.uploadDocument(pdf("price.docx", "%PDF-1.4")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining(".pdf");
    }

    @Test
    void rejectsEmptyFile() {
        assertThatThrownBy(() -> controller.uploadDocument(pdf("a.pdf", "")))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsFilesOver30Mb() {
        MultipartFile big = mock(MultipartFile.class);
        when(big.isEmpty()).thenReturn(false);
        when(big.getOriginalFilename()).thenReturn("scan.pdf");
        when(big.getSize()).thenReturn(30L * 1024 * 1024 + 1);

        assertThatThrownBy(() -> controller.uploadDocument(big))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("30");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd CMS-premium && ./mvnw -q test -Dtest=MediaControllerDocumentTest`
Expected: COMPILATION ERROR — `cannot find symbol: method uploadDocument`.

- [ ] **Step 3: Write minimal implementation**

В `MediaController.java` рядом с остальными константами:

```java
    private static final long MAX_DOCUMENT_SIZE = 30L * 1024 * 1024; // 30 MB: license scans with appendices
    private static final byte[] PDF_SIGNATURE = "%PDF-".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
```

После метода `upload`:

```java
    /**
     * PDFs are stored byte for byte: re-encoding a signed scan would break it, and there is
     * nothing to shrink. The extension alone proves nothing, so the magic bytes are checked
     * too - otherwise a renamed HTML page would be served from our origin.
     */
    @PostMapping(value = "/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadDocument(@RequestPart("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Пустой файл");
        }
        if (file.getSize() > MAX_DOCUMENT_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Файл больше 30 МБ");
        }
        if (!".pdf".equals(extractExtension(file.getOriginalFilename()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Нужен файл .pdf");
        }
        try (InputStream in = file.getInputStream()) {
            byte[] head = in.readNBytes(PDF_SIGNATURE.length);
            if (!java.util.Arrays.equals(head, PDF_SIGNATURE)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Файл не PDF");
            }
        }

        Files.createDirectories(uploadDir);
        String storedName = UUID.randomUUID() + ".pdf";
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, uploadDir.resolve(storedName));
        }

        return Map.of(
                "url", "/uploads/" + storedName,
                "size", String.valueOf(file.getSize())
        );
    }
```

В `application.yml`:

```yaml
  servlet:
    multipart:
      # PDF scans go up to 30 MB (MediaController.uploadDocument); images stay capped at
      # 10 MB by the check in MediaController.upload.
      max-file-size: 30MB
      max-request-size: 32MB
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd CMS-premium && ./mvnw -q test -Dtest=MediaControllerDocumentTest`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add CMS-premium/src/main/java/com/cms/controller/MediaController.java CMS-premium/src/main/resources/application.yml CMS-premium/src/test/java/com/cms/controller/MediaControllerDocumentTest.java
git commit -m "feat(media): загрузка PDF без перекодирования с проверкой сигнатуры"
```

---

### Task 2: Сущности раздела и валидатор

**Files:**
- Create: `CMS-premium/src/main/java/com/cms/entity/DocumentCategory.java`
- Create: `CMS-premium/src/main/java/com/cms/entity/DocumentKind.java`
- Create: `CMS-premium/src/main/java/com/cms/entity/DisclosureDocumentEntity.java`
- Create: `CMS-premium/src/main/java/com/cms/entity/ClinicRequisitesEntity.java`
- Create: `CMS-premium/src/main/java/com/cms/entity/DmsPartnerEntity.java`
- Create: `CMS-premium/src/main/java/com/cms/entity/RegulatorEntity.java`
- Create: `CMS-premium/src/main/java/com/cms/service/DisclosureValidator.java`
- Test: `CMS-premium/src/test/java/com/cms/service/DisclosureValidatorTest.java`

**Interfaces:**
- Produces: перечисление `DocumentCategory { CONTRACT, PRICE_LIST, LICENSE, REGULATION, GUARANTEE_PROGRAM, OTHER, CERTIFICATE, DIPLOMA; boolean isDoctorCategory(); }` — порядок объявления = порядок на сайте; `DocumentKind { FILE, LINK }`.
- Produces: сущности с Lombok `@Data`, поля как в спеке; `DisclosureDocumentEntity.doctor` — `DoctorsEntity`.
- Produces: `DisclosureValidator.clean(String) : String` (обрезает, пустое → `null`); `validateDocument(DisclosureDocumentEntity)`, `validateRequisites(ClinicRequisitesEntity)`, `validateDmsPartner(DmsPartnerEntity)`, `validateRegulator(RegulatorEntity)` — бросают `IllegalArgumentException` с русским текстом.

Отступление от спеки: вместо `@Valid`/`@Pattern` — ручной валидатор. `spring-boot-starter-validation` в проекте не подключён, а PATCH здесь частичный (null = «не менять»): проверять нужно сущность после слияния, а не тело запроса. Валидатор — чистый класс, тестируется без Spring-контекста, как остальные тесты проекта.

- [ ] **Step 1: Создать перечисления и сущности** (без логики, тесты задачи на них опираются)

`DocumentCategory.java`:

```java
package com.cms.entity;

/**
 * Declaration order is the order on the public disclosure page - the service sorts by
 * ordinal, so reordering constants reorders the site.
 */
public enum DocumentCategory {
    CONTRACT,
    PRICE_LIST,
    LICENSE,
    REGULATION,
    GUARANTEE_PROGRAM,
    OTHER,
    CERTIFICATE,
    DIPLOMA;

    /** Doctor documents belong to a doctor card and never appear on the disclosure page. */
    public boolean isDoctorCategory() {
        return this == CERTIFICATE || this == DIPLOMA;
    }
}
```

`DocumentKind.java`:

```java
package com.cms.entity;

public enum DocumentKind {
    FILE,
    LINK
}
```

`DisclosureDocumentEntity.java`:

```java
package com.cms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "disclosure_documents")
public class DisclosureDocumentEntity {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Integer id;

    @Column(nullable = false, length = 300)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private DocumentCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DocumentKind kind;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(length = 500)
    private String note;

    @Column(nullable = false)
    private Integer sortOrder;

    /** Null means the document belongs to the clinic. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DoctorsEntity doctor;

    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = LocalDateTime.now();
    }
}
```

`ClinicRequisitesEntity.java`:

```java
package com.cms.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

/** A single row with id = 1: the clinic has exactly one set of legal details. */
@Data
@Entity
@Table(name = "clinic_requisites")
public class ClinicRequisitesEntity {
    public static final int SINGLE_ID = 1;

    @Id
    private Integer id;

    @Column(length = 500)
    private String legalName;
    @Column(length = 300)
    private String shortName;
    @Column(length = 10)
    private String inn;
    @Column(length = 9)
    private String kpp;
    @Column(length = 13)
    private String ogrn;
    private LocalDate registeredAt;
    @Column(length = 500)
    private String legalAddress;
    @Column(length = 500)
    private String actualAddress;
}
```

`DmsPartnerEntity.java`:

```java
package com.cms.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "dms_partners")
public class DmsPartnerEntity {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Integer id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(length = 1000)
    private String site;

    @Column(nullable = false)
    private Integer sortOrder;
}
```

`RegulatorEntity.java`:

```java
package com.cms.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "regulators")
public class RegulatorEntity {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Integer id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(length = 500)
    private String address;

    @Column(length = 50)
    private String phone;

    @Column(length = 1000)
    private String site;

    @Column(nullable = false)
    private Integer sortOrder;
}
```

- [ ] **Step 2: Write the failing test**

```java
package com.cms.service;

import com.cms.entity.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DisclosureValidatorTest {

    private static DisclosureDocumentEntity doc(DocumentCategory category, DocumentKind kind, String url) {
        DisclosureDocumentEntity d = new DisclosureDocumentEntity();
        d.setTitle("Прейскурант цен");
        d.setCategory(category);
        d.setKind(kind);
        d.setUrl(url);
        d.setSortOrder(0);
        return d;
    }

    private static final String FILE_URL = "/uploads/0b8e7c1a-2f4d-4a55-9d0e-3c1b2a4f5e6d.pdf";

    @Test
    void cleanTrimsAndTurnsBlankIntoNull() {
        assertThat(DisclosureValidator.clean("  0276970983 ")).isEqualTo("0276970983");
        assertThat(DisclosureValidator.clean("   ")).isNull();
        assertThat(DisclosureValidator.clean(null)).isNull();
    }

    @Test
    void acceptsUploadedClinicFile() {
        assertThatCode(() -> DisclosureValidator.validateDocument(
                doc(DocumentCategory.PRICE_LIST, DocumentKind.FILE, FILE_URL))).doesNotThrowAnyException();
    }

    @Test
    void acceptsHttpsLink() {
        assertThatCode(() -> DisclosureValidator.validateDocument(
                doc(DocumentCategory.GUARANTEE_PROGRAM, DocumentKind.LINK, "https://health.bashkortostan.ru/tpgg")))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsBlankTitle() {
        DisclosureDocumentEntity d = doc(DocumentCategory.CONTRACT, DocumentKind.FILE, FILE_URL);
        d.setTitle("  ");
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(d))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("название");
    }

    @Test
    void rejectsJavascriptAndHttpLinks() {
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(
                doc(DocumentCategory.OTHER, DocumentKind.LINK, "javascript:alert(1)")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("https://");
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(
                doc(DocumentCategory.OTHER, DocumentKind.LINK, "http://example.ru")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fileMustPointToUploadedPdf() {
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(
                doc(DocumentCategory.LICENSE, DocumentKind.FILE, "https://evil.example/x.pdf")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(
                doc(DocumentCategory.LICENSE, DocumentKind.FILE, "/uploads/../etc/passwd.pdf")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(
                doc(DocumentCategory.LICENSE, DocumentKind.FILE, "/uploads/photo.webp")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void doctorCategoryRequiresDoctorAndClinicCategoryForbidsIt() {
        DisclosureDocumentEntity orphan = doc(DocumentCategory.CERTIFICATE, DocumentKind.FILE, FILE_URL);
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(orphan))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("врач");

        DisclosureDocumentEntity misplaced = doc(DocumentCategory.PRICE_LIST, DocumentKind.FILE, FILE_URL);
        misplaced.setDoctor(new DoctorsEntity());
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(misplaced))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("клиник");
    }

    @Test
    void rejectsTooLongNote() {
        DisclosureDocumentEntity d = doc(DocumentCategory.CONTRACT, DocumentKind.FILE, FILE_URL);
        d.setNote("x".repeat(501));
        assertThatThrownBy(() -> DisclosureValidator.validateDocument(d))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("500");
    }

    private static ClinicRequisitesEntity requisites() {
        ClinicRequisitesEntity r = new ClinicRequisitesEntity();
        r.setInn("0276970983");
        r.setKpp("027401001");
        r.setOgrn("1220200030710");
        r.setRegisteredAt(LocalDate.of(2022, 9, 6));
        return r;
    }

    @Test
    void acceptsValidAndEmptyRequisites() {
        assertThatCode(() -> DisclosureValidator.validateRequisites(requisites())).doesNotThrowAnyException();
        assertThatCode(() -> DisclosureValidator.validateRequisites(new ClinicRequisitesEntity()))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsMalformedCodes() {
        ClinicRequisitesEntity inn = requisites();
        inn.setInn("0276 970983");
        assertThatThrownBy(() -> DisclosureValidator.validateRequisites(inn)).hasMessageContaining("ИНН");

        ClinicRequisitesEntity kpp = requisites();
        kpp.setKpp("02740100");
        assertThatThrownBy(() -> DisclosureValidator.validateRequisites(kpp)).hasMessageContaining("КПП");

        ClinicRequisitesEntity ogrn = requisites();
        ogrn.setOgrn("122020003071O"); // latin O instead of zero
        assertThatThrownBy(() -> DisclosureValidator.validateRequisites(ogrn)).hasMessageContaining("ОГРН");
    }

    @Test
    void partnerAndRegulatorNeedNameAndHttpsSite() {
        DmsPartnerEntity p = new DmsPartnerEntity();
        p.setName("  ");
        assertThatThrownBy(() -> DisclosureValidator.validateDmsPartner(p)).hasMessageContaining("название");
        p.setName("СОГАЗ");
        p.setSite("ftp://sogaz.ru");
        assertThatThrownBy(() -> DisclosureValidator.validateDmsPartner(p)).hasMessageContaining("https://");
        p.setSite(null);
        assertThatCode(() -> DisclosureValidator.validateDmsPartner(p)).doesNotThrowAnyException();

        RegulatorEntity r = new RegulatorEntity();
        r.setName("Управление Роспотребнадзора по Республике Башкортостан");
        r.setSite("https://02.rospotrebnadzor.ru");
        assertThatCode(() -> DisclosureValidator.validateRegulator(r)).doesNotThrowAnyException();
        r.setPhone("8".repeat(51));
        assertThatThrownBy(() -> DisclosureValidator.validateRegulator(r)).hasMessageContaining("Телефон");
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd CMS-premium && ./mvnw -q test -Dtest=DisclosureValidatorTest`
Expected: COMPILATION ERROR — `cannot find symbol: class DisclosureValidator`.

- [ ] **Step 4: Write minimal implementation**

`DisclosureValidator.java`:

```java
package com.cms.service;

import com.cms.entity.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.regex.Pattern;

/**
 * Checks for the disclosure section. Runs on the entity after a partial PATCH has been
 * merged, because a PATCH body alone does not show the final state. Every failure is an
 * IllegalArgumentException, which GlobalExceptionHandler turns into 400 with the message -
 * the admin UI shows that message next to the field, so it is written for the editor.
 */
public final class DisclosureValidator {

    static final int TITLE_MAX = 300;
    static final int NOTE_MAX = 500;
    static final int URL_MAX = 1000;
    static final int NAME_MAX = 300;
    static final int ADDRESS_MAX = 500;
    static final int PHONE_MAX = 50;

    /** Exactly what MediaController.uploadDocument hands out: no traversal, no other types. */
    private static final Pattern FILE_URL = Pattern.compile("^/uploads/[0-9A-Za-z-]+\\.pdf$");
    private static final Pattern INN = Pattern.compile("^\\d{10}$");
    private static final Pattern KPP = Pattern.compile("^\\d{9}$");
    private static final Pattern OGRN = Pattern.compile("^\\d{13}$");

    private DisclosureValidator() {
    }

    /** Trims; a blank value becomes null so that "cleared" and "never set" look the same. */
    public static String clean(String value) {
        if (value == null) return null;
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static void validateDocument(DisclosureDocumentEntity d) {
        if (clean(d.getTitle()) == null) fail("Укажите название документа");
        max(d.getTitle(), TITLE_MAX, "Название");
        if (d.getCategory() == null) fail("Выберите категорию документа");
        if (d.getKind() == null) fail("Выберите тип: файл или ссылка");
        max(d.getNote(), NOTE_MAX, "Примечание");

        String url = d.getUrl();
        if (clean(url) == null) fail(d.getKind() == DocumentKind.FILE ? "Загрузите PDF" : "Укажите ссылку");
        if (d.getKind() == DocumentKind.FILE && !FILE_URL.matcher(url).matches()) {
            fail("Файл должен быть загружен через админку");
        }
        if (d.getKind() == DocumentKind.LINK && !isHttpsUrl(url)) {
            fail("Ссылка должна начинаться с https://");
        }

        if (d.getCategory().isDoctorCategory() && d.getDoctor() == null) {
            fail("Сертификат и диплом привязываются к врачу");
        }
        if (!d.getCategory().isDoctorCategory() && d.getDoctor() != null) {
            fail("Эта категория — для документов клиники, не врача");
        }
    }

    public static void validateRequisites(ClinicRequisitesEntity r) {
        code(r.getInn(), INN, "ИНН — 10 цифр");
        code(r.getKpp(), KPP, "КПП — 9 цифр");
        code(r.getOgrn(), OGRN, "ОГРН — 13 цифр");
        max(r.getLegalName(), ADDRESS_MAX, "Полное наименование");
        max(r.getShortName(), NAME_MAX, "Сокращённое наименование");
        max(r.getLegalAddress(), ADDRESS_MAX, "Юридический адрес");
        max(r.getActualAddress(), ADDRESS_MAX, "Фактический адрес");
    }

    public static void validateDmsPartner(DmsPartnerEntity p) {
        if (clean(p.getName()) == null) fail("Укажите название страховой компании");
        max(p.getName(), NAME_MAX, "Название");
        optionalSite(p.getSite());
    }

    public static void validateRegulator(RegulatorEntity r) {
        if (clean(r.getName()) == null) fail("Укажите название органа");
        max(r.getName(), NAME_MAX, "Название");
        max(r.getAddress(), ADDRESS_MAX, "Адрес");
        max(r.getPhone(), PHONE_MAX, "Телефон");
        optionalSite(r.getSite());
    }

    static boolean isHttpsUrl(String value) {
        if (value == null || value.length() > URL_MAX) return false;
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null;
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private static void optionalSite(String site) {
        if (site != null && !isHttpsUrl(site)) fail("Сайт должен начинаться с https://");
    }

    private static void code(String value, Pattern pattern, String message) {
        if (value != null && !pattern.matcher(value).matches()) fail(message);
    }

    private static void max(String value, int limit, String field) {
        if (value != null && value.length() > limit) fail(field + ": не длиннее " + limit + " символов");
    }

    private static void fail(String message) {
        throw new IllegalArgumentException(message);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd CMS-premium && ./mvnw -q test -Dtest=DisclosureValidatorTest`
Expected: PASS (11 tests).

- [ ] **Step 6: Commit**

```bash
git add CMS-premium/src/main/java/com/cms/entity/DocumentCategory.java CMS-premium/src/main/java/com/cms/entity/DocumentKind.java CMS-premium/src/main/java/com/cms/entity/DisclosureDocumentEntity.java CMS-premium/src/main/java/com/cms/entity/ClinicRequisitesEntity.java CMS-premium/src/main/java/com/cms/entity/DmsPartnerEntity.java CMS-premium/src/main/java/com/cms/entity/RegulatorEntity.java CMS-premium/src/main/java/com/cms/service/DisclosureValidator.java CMS-premium/src/test/java/com/cms/service/DisclosureValidatorTest.java
git commit -m "feat(disclosure): сущности раздела раскрытия и их валидатор"
```

---

### Task 3: Репозитории, DTO и сервис

**Files:**
- Create: `CMS-premium/src/main/java/com/cms/repo/DisclosureDocumentRepository.java`
- Create: `CMS-premium/src/main/java/com/cms/repo/ClinicRequisitesRepository.java`
- Create: `CMS-premium/src/main/java/com/cms/repo/DmsPartnerRepository.java`
- Create: `CMS-premium/src/main/java/com/cms/repo/RegulatorRepository.java`
- Create: `CMS-premium/src/main/java/com/cms/dto/DisclosureDocumentRequestDto.java`
- Create: `CMS-premium/src/main/java/com/cms/dto/DisclosureDocumentResponseDto.java`
- Create: `CMS-premium/src/main/java/com/cms/dto/RequisitesDto.java`
- Create: `CMS-premium/src/main/java/com/cms/dto/DmsPartnerDto.java`
- Create: `CMS-premium/src/main/java/com/cms/dto/RegulatorDto.java`
- Create: `CMS-premium/src/main/java/com/cms/dto/OrderRequestDto.java`
- Create: `CMS-premium/src/main/java/com/cms/dto/DisclosureResponseDto.java`
- Create: `CMS-premium/src/main/java/com/cms/service/DisclosureService.java`
- Test: `CMS-premium/src/test/java/com/cms/service/DisclosureServiceTest.java`

**Interfaces:**
- Consumes: сущности и `DisclosureValidator` из задачи 2; `DoctorRepository` (существующий).
- Produces (JSON-формы, на них опирается фронт):
  - `DisclosureDocumentResponseDto { id, title, category, kind, url, note (""), sortOrder, doctorId (null|число), updatedAt (ISO LocalDateTime) }`
  - `DisclosureDocumentRequestDto { title, category, kind, url, note, doctorId }` — все поля nullable, PATCH: `null` = не менять.
  - `RequisitesDto { legalName, shortName, inn, kpp, ogrn, registeredAt ("YYYY-MM-DD"|""), legalAddress, actualAddress }` — в ответе всегда строки, `null` → `""`; в PATCH `null` = не менять, `""` = очистить.
  - `DmsPartnerDto { id, name, site, sortOrder }`, `RegulatorDto { id, name, address, phone, site, sortOrder }` — те же правила строк; в запросах `id` и `sortOrder` игнорируются.
  - `OrderRequestDto { ids: Integer[] }`.
  - `DisclosureResponseDto { requisites, documents, dmsPartners, regulators }`.
- Produces (Java, `DisclosureService`): `publicDisclosure()`, `listDocuments(Integer doctorId)`, `createDocument(req)`, `patchDocument(id, req)`, `deleteDocument(id)`, `reorderDocuments(List<Integer>)`, `getRequisites()`, `patchRequisites(RequisitesDto)`, `listDmsPartners()`, `createDmsPartner(DmsPartnerDto)`, `patchDmsPartner(id, dto)`, `deleteDmsPartner(id)`, `reorderDmsPartners(List<Integer>)`, и такие же пять методов для `Regulator`.

- [ ] **Step 1: Создать репозитории и DTO**

`DisclosureDocumentRepository.java`:

```java
package com.cms.repo;

import com.cms.entity.DisclosureDocumentEntity;
import com.cms.entity.DocumentCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisclosureDocumentRepository extends JpaRepository<DisclosureDocumentEntity, Integer> {
    List<DisclosureDocumentEntity> findByDoctorIsNull();
    List<DisclosureDocumentEntity> findByDoctor_Id(Integer doctorId);
    List<DisclosureDocumentEntity> findByCategoryAndDoctorIsNull(DocumentCategory category);
    List<DisclosureDocumentEntity> findByCategoryAndDoctor_Id(DocumentCategory category, Integer doctorId);
}
```

`ClinicRequisitesRepository.java`:

```java
package com.cms.repo;

import com.cms.entity.ClinicRequisitesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClinicRequisitesRepository extends JpaRepository<ClinicRequisitesEntity, Integer> {
}
```

`DmsPartnerRepository.java`:

```java
package com.cms.repo;

import com.cms.entity.DmsPartnerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DmsPartnerRepository extends JpaRepository<DmsPartnerEntity, Integer> {
}
```

`RegulatorRepository.java`:

```java
package com.cms.repo;

import com.cms.entity.RegulatorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RegulatorRepository extends JpaRepository<RegulatorEntity, Integer> {
}
```

`DisclosureDocumentRequestDto.java`:

```java
package com.cms.dto;

import com.cms.entity.DocumentCategory;
import com.cms.entity.DocumentKind;

public record DisclosureDocumentRequestDto(
        String title,
        DocumentCategory category,
        DocumentKind kind,
        String url,
        String note,
        Integer doctorId
) {
}
```

`DisclosureDocumentResponseDto.java`:

```java
package com.cms.dto;

import com.cms.entity.DisclosureDocumentEntity;
import com.cms.entity.DocumentCategory;
import com.cms.entity.DocumentKind;

import java.time.LocalDateTime;

public record DisclosureDocumentResponseDto(
        Integer id,
        String title,
        DocumentCategory category,
        DocumentKind kind,
        String url,
        String note,
        Integer sortOrder,
        Integer doctorId,
        LocalDateTime updatedAt
) {
    public static DisclosureDocumentResponseDto from(DisclosureDocumentEntity e) {
        return new DisclosureDocumentResponseDto(
                e.getId(),
                e.getTitle(),
                e.getCategory(),
                e.getKind(),
                e.getUrl(),
                e.getNote() == null ? "" : e.getNote(),
                e.getSortOrder(),
                // getId() on a lazy proxy does not hit the database.
                e.getDoctor() == null ? null : e.getDoctor().getId(),
                e.getUpdatedAt()
        );
    }
}
```

`RequisitesDto.java`:

```java
package com.cms.dto;

import com.cms.entity.ClinicRequisitesEntity;

/**
 * Same shape for request and response. In a response every field is a string ("" when
 * unset) so the site never has to null-check; in a PATCH null means "leave as is".
 */
public record RequisitesDto(
        String legalName,
        String shortName,
        String inn,
        String kpp,
        String ogrn,
        String registeredAt,
        String legalAddress,
        String actualAddress
) {
    public static final RequisitesDto EMPTY = new RequisitesDto("", "", "", "", "", "", "", "");

    public static RequisitesDto from(ClinicRequisitesEntity e) {
        return new RequisitesDto(
                orEmpty(e.getLegalName()),
                orEmpty(e.getShortName()),
                orEmpty(e.getInn()),
                orEmpty(e.getKpp()),
                orEmpty(e.getOgrn()),
                e.getRegisteredAt() == null ? "" : e.getRegisteredAt().toString(),
                orEmpty(e.getLegalAddress()),
                orEmpty(e.getActualAddress())
        );
    }

    static String orEmpty(String value) {
        return value == null ? "" : value;
    }
}
```

`DmsPartnerDto.java`:

```java
package com.cms.dto;

import com.cms.entity.DmsPartnerEntity;

public record DmsPartnerDto(Integer id, String name, String site, Integer sortOrder) {
    public static DmsPartnerDto from(DmsPartnerEntity e) {
        return new DmsPartnerDto(e.getId(), e.getName(), RequisitesDto.orEmpty(e.getSite()), e.getSortOrder());
    }
}
```

`RegulatorDto.java`:

```java
package com.cms.dto;

import com.cms.entity.RegulatorEntity;

public record RegulatorDto(Integer id, String name, String address, String phone, String site, Integer sortOrder) {
    public static RegulatorDto from(RegulatorEntity e) {
        return new RegulatorDto(
                e.getId(),
                e.getName(),
                RequisitesDto.orEmpty(e.getAddress()),
                RequisitesDto.orEmpty(e.getPhone()),
                RequisitesDto.orEmpty(e.getSite()),
                e.getSortOrder()
        );
    }
}
```

`OrderRequestDto.java`:

```java
package com.cms.dto;

import java.util.List;

public record OrderRequestDto(List<Integer> ids) {
}
```

`DisclosureResponseDto.java`:

```java
package com.cms.dto;

import java.util.List;

public record DisclosureResponseDto(
        RequisitesDto requisites,
        List<DisclosureDocumentResponseDto> documents,
        List<DmsPartnerDto> dmsPartners,
        List<RegulatorDto> regulators
) {
}
```

- [ ] **Step 2: Write the failing test**

```java
package com.cms.service;

import com.cms.dto.*;
import com.cms.entity.*;
import com.cms.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DisclosureServiceTest {

    private static final String FILE_URL = "/uploads/0b8e7c1a-2f4d-4a55-9d0e-3c1b2a4f5e6d.pdf";

    private DisclosureDocumentRepository documents;
    private ClinicRequisitesRepository requisites;
    private DmsPartnerRepository partners;
    private RegulatorRepository regulators;
    private DoctorRepository doctors;
    private DisclosureService service;

    @BeforeEach
    void setUp() {
        documents = mock(DisclosureDocumentRepository.class);
        requisites = mock(ClinicRequisitesRepository.class);
        partners = mock(DmsPartnerRepository.class);
        regulators = mock(RegulatorRepository.class);
        doctors = mock(DoctorRepository.class);
        service = new DisclosureService(documents, requisites, partners, regulators, doctors);

        when(documents.save(any(DisclosureDocumentEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(requisites.save(any(ClinicRequisitesEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(partners.save(any(DmsPartnerEntity.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static DisclosureDocumentEntity stored(int id, DocumentCategory category, int order) {
        DisclosureDocumentEntity d = new DisclosureDocumentEntity();
        d.setId(id);
        d.setTitle("Документ " + id);
        d.setCategory(category);
        d.setKind(DocumentKind.FILE);
        d.setUrl(FILE_URL);
        d.setSortOrder(order);
        return d;
    }

    @Test
    void publicDisclosureSortsBySiteOrderAndSkipsDoctorDocuments() {
        when(documents.findByDoctorIsNull()).thenReturn(List.of(
                stored(1, DocumentCategory.OTHER, 0),
                stored(2, DocumentCategory.PRICE_LIST, 1),
                stored(3, DocumentCategory.CONTRACT, 0),
                stored(4, DocumentCategory.PRICE_LIST, 0)));
        when(requisites.findById(1)).thenReturn(Optional.empty());

        DisclosureResponseDto result = service.publicDisclosure();

        assertThat(result.documents()).extracting(DisclosureDocumentResponseDto::id).containsExactly(3, 4, 2, 1);
        assertThat(result.requisites()).isEqualTo(RequisitesDto.EMPTY);
        verify(documents, never()).findAll();
    }

    @Test
    void createDocumentGoesToTheEndOfItsCategory() {
        when(documents.findByCategoryAndDoctorIsNull(DocumentCategory.PRICE_LIST))
                .thenReturn(List.of(stored(4, DocumentCategory.PRICE_LIST, 0), stored(2, DocumentCategory.PRICE_LIST, 1)));

        DisclosureDocumentResponseDto created = service.createDocument(new DisclosureDocumentRequestDto(
                "  Прейскурант цен ", DocumentCategory.PRICE_LIST, DocumentKind.FILE, FILE_URL, "", null));

        assertThat(created.sortOrder()).isEqualTo(2);
        assertThat(created.title()).isEqualTo("Прейскурант цен");
        assertThat(created.note()).isEqualTo("");
    }

    @Test
    void createDoctorDocumentAttachesTheDoctor() {
        DoctorsEntity doctor = new DoctorsEntity();
        doctor.setId(7);
        when(doctors.findById(7)).thenReturn(Optional.of(doctor));
        when(documents.findByCategoryAndDoctor_Id(DocumentCategory.CERTIFICATE, 7)).thenReturn(List.of());

        DisclosureDocumentResponseDto created = service.createDocument(new DisclosureDocumentRequestDto(
                "Сертификат невролога", DocumentCategory.CERTIFICATE, DocumentKind.FILE, FILE_URL, null, 7));

        assertThat(created.doctorId()).isEqualTo(7);
        assertThat(created.sortOrder()).isZero();
    }

    @Test
    void createForUnknownDoctorIs404() {
        when(doctors.findById(99)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createDocument(new DisclosureDocumentRequestDto(
                "Диплом", DocumentCategory.DIPLOMA, DocumentKind.FILE, FILE_URL, null, 99)))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void patchReplacesOnlyGivenFieldsAndRevalidates() {
        DisclosureDocumentEntity price = stored(2, DocumentCategory.PRICE_LIST, 1);
        when(documents.findById(2)).thenReturn(Optional.of(price));
        String newFile = "/uploads/1c9f8d2b-3e5a-4b66-8e1f-4d2c3b5a6f7e.pdf";

        DisclosureDocumentResponseDto patched = service.patchDocument(2,
                new DisclosureDocumentRequestDto(null, null, null, newFile, null, null));

        assertThat(patched.url()).isEqualTo(newFile);
        assertThat(patched.title()).isEqualTo("Документ 2");
        assertThat(patched.sortOrder()).isEqualTo(1);

        assertThatThrownBy(() -> service.patchDocument(2,
                new DisclosureDocumentRequestDto(null, null, DocumentKind.LINK, null, null, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void movingToAnotherCategoryAppendsToIt() {
        DisclosureDocumentEntity doc = stored(1, DocumentCategory.OTHER, 0);
        when(documents.findById(1)).thenReturn(Optional.of(doc));
        when(documents.findByCategoryAndDoctorIsNull(DocumentCategory.LICENSE))
                .thenReturn(List.of(stored(5, DocumentCategory.LICENSE, 0)));

        DisclosureDocumentResponseDto moved = service.patchDocument(1,
                new DisclosureDocumentRequestDto(null, DocumentCategory.LICENSE, null, null, null, null));

        assertThat(moved.category()).isEqualTo(DocumentCategory.LICENSE);
        assertThat(moved.sortOrder()).isEqualTo(1);
    }

    @Test
    void reorderSetsPositionsWithinOneCategory() {
        DisclosureDocumentEntity a = stored(4, DocumentCategory.PRICE_LIST, 0);
        DisclosureDocumentEntity b = stored(2, DocumentCategory.PRICE_LIST, 1);
        when(documents.findById(2)).thenReturn(Optional.of(b));
        when(documents.findByCategoryAndDoctorIsNull(DocumentCategory.PRICE_LIST)).thenReturn(List.of(a, b));

        service.reorderDocuments(List.of(2, 4));

        assertThat(b.getSortOrder()).isZero();
        assertThat(a.getSortOrder()).isEqualTo(1);
        verify(documents).saveAll(List.of(b, a));
    }

    @Test
    void reorderWithStaleOrIncompleteListIsRejected() {
        DisclosureDocumentEntity a = stored(4, DocumentCategory.PRICE_LIST, 0);
        DisclosureDocumentEntity b = stored(2, DocumentCategory.PRICE_LIST, 1);
        when(documents.findById(2)).thenReturn(Optional.of(b));
        when(documents.findById(9)).thenReturn(Optional.empty());
        when(documents.findByCategoryAndDoctorIsNull(DocumentCategory.PRICE_LIST)).thenReturn(List.of(a, b));

        assertThatThrownBy(() -> service.reorderDocuments(List.of(2)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("устарел");
        assertThatThrownBy(() -> service.reorderDocuments(List.of(2, 2)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.reorderDocuments(List.of(9, 4)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("устарел");
        assertThatThrownBy(() -> service.reorderDocuments(List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        verify(documents, never()).saveAll(any());
    }

    @Test
    void deleteUnknownDocumentIs404() {
        when(documents.existsById(3)).thenReturn(false);
        assertThatThrownBy(() -> service.deleteDocument(3)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void patchRequisitesCreatesRowTrimsAndClears() {
        ClinicRequisitesEntity existing = new ClinicRequisitesEntity();
        existing.setId(1);
        existing.setShortName("ООО «ПРЕМИУМ»");
        existing.setKpp("027401001");
        when(requisites.findById(1)).thenReturn(Optional.of(existing));

        RequisitesDto result = service.patchRequisites(new RequisitesDto(
                null, null, " 0276970983 ", "", null, "2022-09-06", null, null));

        assertThat(result.inn()).isEqualTo("0276970983");
        assertThat(result.kpp()).isEqualTo("");
        assertThat(result.shortName()).isEqualTo("ООО «ПРЕМИУМ»");
        assertThat(existing.getRegisteredAt()).isEqualTo(LocalDate.of(2022, 9, 6));
    }

    @Test
    void patchRequisitesOnEmptyTableUsesSingleId() {
        when(requisites.findById(1)).thenReturn(Optional.empty());
        service.patchRequisites(new RequisitesDto("Общество", null, null, null, null, null, null, null));
        verify(requisites).save(argThat(r -> r.getId() == 1 && "Общество".equals(r.getLegalName())));
    }

    @Test
    void patchRequisitesRejectsBadDateAndBadInn() {
        when(requisites.findById(1)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.patchRequisites(new RequisitesDto(
                null, null, null, null, null, "06.09.2022", null, null)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("дата");
        assertThatThrownBy(() -> service.patchRequisites(new RequisitesDto(
                null, null, "ИНН 0276970983", null, null, null, null, null)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ИНН");
        verify(requisites, never()).save(any());
    }

    @Test
    void partnersAreAppendedAndReorderedAsOneGroup() {
        DmsPartnerEntity sogaz = new DmsPartnerEntity();
        sogaz.setId(1);
        sogaz.setName("СОГАЗ");
        sogaz.setSortOrder(0);
        when(partners.findAll()).thenReturn(List.of(sogaz));

        DmsPartnerDto created = service.createDmsPartner(new DmsPartnerDto(null, " Ингосстрах ", "", null));
        assertThat(created.sortOrder()).isEqualTo(1);
        assertThat(created.name()).isEqualTo("Ингосстрах");
        assertThat(created.site()).isEqualTo("");

        assertThatThrownBy(() -> service.reorderDmsPartners(List.of(1, 5)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd CMS-premium && ./mvnw -q test -Dtest=DisclosureServiceTest`
Expected: COMPILATION ERROR — `cannot find symbol: class DisclosureService`.

- [ ] **Step 4: Write minimal implementation**

`DisclosureService.java`:

```java
package com.cms.service;

import com.cms.dto.*;
import com.cms.entity.*;
import com.cms.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;

import static com.cms.service.DisclosureValidator.clean;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class DisclosureService {

    private static final Comparator<DisclosureDocumentEntity> SITE_ORDER =
            Comparator.comparing((DisclosureDocumentEntity d) -> d.getCategory().ordinal())
                    .thenComparing(DisclosureDocumentEntity::getSortOrder)
                    .thenComparing(DisclosureDocumentEntity::getId);

    private final DisclosureDocumentRepository documents;
    private final ClinicRequisitesRepository requisites;
    private final DmsPartnerRepository partners;
    private final RegulatorRepository regulators;
    private final DoctorRepository doctors;

    public DisclosureService(DisclosureDocumentRepository documents, ClinicRequisitesRepository requisites,
                             DmsPartnerRepository partners, RegulatorRepository regulators,
                             DoctorRepository doctors) {
        this.documents = documents;
        this.requisites = requisites;
        this.partners = partners;
        this.regulators = regulators;
        this.doctors = doctors;
    }

    // ── Public page ──

    public DisclosureResponseDto publicDisclosure() {
        return new DisclosureResponseDto(
                getRequisites(),
                listDocuments(null),
                listDmsPartners(),
                listRegulators()
        );
    }

    // ── Documents ──

    /** Null doctorId lists clinic documents - never doctor ones, see Global Constraints. */
    public List<DisclosureDocumentResponseDto> listDocuments(Integer doctorId) {
        List<DisclosureDocumentEntity> found = doctorId == null
                ? documents.findByDoctorIsNull()
                : documents.findByDoctor_Id(doctorId);
        return found.stream().sorted(SITE_ORDER).map(DisclosureDocumentResponseDto::from).toList();
    }

    public DisclosureDocumentResponseDto createDocument(DisclosureDocumentRequestDto request) {
        DisclosureDocumentEntity entity = new DisclosureDocumentEntity();
        entity.setTitle(clean(request.title()));
        entity.setCategory(request.category());
        entity.setKind(request.kind());
        entity.setUrl(clean(request.url()));
        entity.setNote(clean(request.note()));
        if (request.doctorId() != null) entity.setDoctor(findDoctor(request.doctorId()));
        DisclosureValidator.validateDocument(entity);
        entity.setSortOrder(nextDocumentOrder(entity.getCategory(), request.doctorId()));
        return DisclosureDocumentResponseDto.from(documents.save(entity));
    }

    public DisclosureDocumentResponseDto patchDocument(Integer id, DisclosureDocumentRequestDto request) {
        DisclosureDocumentEntity entity = documents.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Документ не найден"));
        DocumentCategory before = entity.getCategory();
        if (request.title() != null) entity.setTitle(clean(request.title()));
        if (request.category() != null) entity.setCategory(request.category());
        if (request.kind() != null) entity.setKind(request.kind());
        if (request.url() != null) entity.setUrl(clean(request.url()));
        if (request.note() != null) entity.setNote(clean(request.note()));
        // The owner is fixed at creation: a certificate does not move between doctors.
        DisclosureValidator.validateDocument(entity);
        if (entity.getCategory() != before) {
            Integer doctorId = entity.getDoctor() == null ? null : entity.getDoctor().getId();
            entity.setSortOrder(nextDocumentOrder(entity.getCategory(), doctorId));
        }
        return DisclosureDocumentResponseDto.from(documents.save(entity));
    }

    public void deleteDocument(Integer id) {
        if (!documents.existsById(id)) throw new ResponseStatusException(NOT_FOUND, "Документ не найден");
        documents.deleteById(id);
    }

    /** ids is the full new order of one group: one category of one owner. */
    @Transactional
    public void reorderDocuments(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) throw new IllegalArgumentException("Пустой список порядка");
        DisclosureDocumentEntity first = documents.findById(ids.get(0)).orElseThrow(DisclosureService::stale);
        Integer doctorId = first.getDoctor() == null ? null : first.getDoctor().getId();
        documents.saveAll(applyOrder(ids, documentGroup(first.getCategory(), doctorId),
                DisclosureDocumentEntity::getId, DisclosureDocumentEntity::setSortOrder));
    }

    private List<DisclosureDocumentEntity> documentGroup(DocumentCategory category, Integer doctorId) {
        return doctorId == null
                ? documents.findByCategoryAndDoctorIsNull(category)
                : documents.findByCategoryAndDoctor_Id(category, doctorId);
    }

    private int nextDocumentOrder(DocumentCategory category, Integer doctorId) {
        return documentGroup(category, doctorId).stream()
                .mapToInt(DisclosureDocumentEntity::getSortOrder).max().orElse(-1) + 1;
    }

    private DoctorsEntity findDoctor(Integer id) {
        return doctors.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Врач не найден"));
    }

    // ── Requisites ──

    public RequisitesDto getRequisites() {
        return requisites.findById(ClinicRequisitesEntity.SINGLE_ID)
                .map(RequisitesDto::from)
                .orElse(RequisitesDto.EMPTY);
    }

    public RequisitesDto patchRequisites(RequisitesDto request) {
        ClinicRequisitesEntity entity = requisites.findById(ClinicRequisitesEntity.SINGLE_ID).orElseGet(() -> {
            ClinicRequisitesEntity fresh = new ClinicRequisitesEntity();
            fresh.setId(ClinicRequisitesEntity.SINGLE_ID);
            return fresh;
        });
        setIfGiven(request.legalName(), entity::setLegalName);
        setIfGiven(request.shortName(), entity::setShortName);
        setIfGiven(request.inn(), entity::setInn);
        setIfGiven(request.kpp(), entity::setKpp);
        setIfGiven(request.ogrn(), entity::setOgrn);
        setIfGiven(request.legalAddress(), entity::setLegalAddress);
        setIfGiven(request.actualAddress(), entity::setActualAddress);
        if (request.registeredAt() != null) entity.setRegisteredAt(parseDate(request.registeredAt()));
        DisclosureValidator.validateRequisites(entity);
        return RequisitesDto.from(requisites.save(entity));
    }

    private static LocalDate parseDate(String raw) {
        String value = clean(raw);
        if (value == null) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Неверная дата регистрации: нужен формат ГГГГ-ММ-ДД");
        }
    }

    // ── DMS partners ──

    public List<DmsPartnerDto> listDmsPartners() {
        return sortedPartners().stream().map(DmsPartnerDto::from).toList();
    }

    public DmsPartnerDto createDmsPartner(DmsPartnerDto request) {
        DmsPartnerEntity entity = new DmsPartnerEntity();
        entity.setName(clean(request.name()));
        entity.setSite(clean(request.site()));
        DisclosureValidator.validateDmsPartner(entity);
        entity.setSortOrder(partners.findAll().stream()
                .mapToInt(DmsPartnerEntity::getSortOrder).max().orElse(-1) + 1);
        return DmsPartnerDto.from(partners.save(entity));
    }

    public DmsPartnerDto patchDmsPartner(Integer id, DmsPartnerDto request) {
        DmsPartnerEntity entity = partners.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Страховая компания не найдена"));
        setIfGiven(request.name(), entity::setName);
        setIfGiven(request.site(), entity::setSite);
        DisclosureValidator.validateDmsPartner(entity);
        return DmsPartnerDto.from(partners.save(entity));
    }

    public void deleteDmsPartner(Integer id) {
        if (!partners.existsById(id)) throw new ResponseStatusException(NOT_FOUND, "Страховая компания не найдена");
        partners.deleteById(id);
    }

    @Transactional
    public void reorderDmsPartners(List<Integer> ids) {
        partners.saveAll(applyOrder(ids, partners.findAll(), DmsPartnerEntity::getId, DmsPartnerEntity::setSortOrder));
    }

    private List<DmsPartnerEntity> sortedPartners() {
        return partners.findAll().stream()
                .sorted(Comparator.comparing(DmsPartnerEntity::getSortOrder).thenComparing(DmsPartnerEntity::getId))
                .toList();
    }

    // ── Regulators ──

    public List<RegulatorDto> listRegulators() {
        return regulators.findAll().stream()
                .sorted(Comparator.comparing(RegulatorEntity::getSortOrder).thenComparing(RegulatorEntity::getId))
                .map(RegulatorDto::from)
                .toList();
    }

    public RegulatorDto createRegulator(RegulatorDto request) {
        RegulatorEntity entity = new RegulatorEntity();
        entity.setName(clean(request.name()));
        entity.setAddress(clean(request.address()));
        entity.setPhone(clean(request.phone()));
        entity.setSite(clean(request.site()));
        DisclosureValidator.validateRegulator(entity);
        entity.setSortOrder(regulators.findAll().stream()
                .mapToInt(RegulatorEntity::getSortOrder).max().orElse(-1) + 1);
        return RegulatorDto.from(regulators.save(entity));
    }

    public RegulatorDto patchRegulator(Integer id, RegulatorDto request) {
        RegulatorEntity entity = regulators.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Орган не найден"));
        setIfGiven(request.name(), entity::setName);
        setIfGiven(request.address(), entity::setAddress);
        setIfGiven(request.phone(), entity::setPhone);
        setIfGiven(request.site(), entity::setSite);
        DisclosureValidator.validateRegulator(entity);
        return RegulatorDto.from(regulators.save(entity));
    }

    public void deleteRegulator(Integer id) {
        if (!regulators.existsById(id)) throw new ResponseStatusException(NOT_FOUND, "Орган не найден");
        regulators.deleteById(id);
    }

    @Transactional
    public void reorderRegulators(List<Integer> ids) {
        regulators.saveAll(applyOrder(ids, regulators.findAll(), RegulatorEntity::getId, RegulatorEntity::setSortOrder));
    }

    // ── Shared ──

    /** PATCH convention of this section: null leaves the field, "" clears it. */
    private static void setIfGiven(String value, Consumer<String> setter) {
        if (value != null) setter.accept(clean(value));
    }

    /**
     * The client sends the whole group in its new order. Anything else - a missing id, an
     * extra one, a duplicate - means the admin looked at a list that has changed since.
     * Returns the entities in the new order.
     */
    private static <T> List<T> applyOrder(List<Integer> ids, List<T> group,
                                          Function<T, Integer> idOf, BiConsumer<T, Integer> setOrder) {
        if (ids == null || ids.isEmpty()) throw new IllegalArgumentException("Пустой список порядка");
        if (new HashSet<>(ids).size() != ids.size()) throw new IllegalArgumentException("В порядке повторяются записи");
        Map<Integer, T> byId = new HashMap<>();
        for (T item : group) byId.put(idOf.apply(item), item);
        if (!byId.keySet().equals(new HashSet<>(ids))) throw stale();
        List<T> ordered = new ArrayList<>(ids.size());
        for (int i = 0; i < ids.size(); i++) {
            T item = byId.get(ids.get(i));
            setOrder.accept(item, i);
            ordered.add(item);
        }
        return ordered;
    }

    private static IllegalArgumentException stale() {
        return new IllegalArgumentException("Список устарел — обновите страницу");
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd CMS-premium && ./mvnw -q test -Dtest=DisclosureServiceTest`
Expected: PASS (13 tests).

- [ ] **Step 6: Commit**

```bash
git add CMS-premium/src/main/java/com/cms/repo/DisclosureDocumentRepository.java CMS-premium/src/main/java/com/cms/repo/ClinicRequisitesRepository.java CMS-premium/src/main/java/com/cms/repo/DmsPartnerRepository.java CMS-premium/src/main/java/com/cms/repo/RegulatorRepository.java CMS-premium/src/main/java/com/cms/dto/DisclosureDocumentRequestDto.java CMS-premium/src/main/java/com/cms/dto/DisclosureDocumentResponseDto.java CMS-premium/src/main/java/com/cms/dto/RequisitesDto.java CMS-premium/src/main/java/com/cms/dto/DmsPartnerDto.java CMS-premium/src/main/java/com/cms/dto/RegulatorDto.java CMS-premium/src/main/java/com/cms/dto/OrderRequestDto.java CMS-premium/src/main/java/com/cms/dto/DisclosureResponseDto.java CMS-premium/src/main/java/com/cms/service/DisclosureService.java CMS-premium/src/test/java/com/cms/service/DisclosureServiceTest.java
git commit -m "feat(disclosure): сервис раздела раскрытия — документы, реквизиты, ДМС, органы"
```

---

### Task 4: HTTP-слой раздела

**Files:**
- Create: `CMS-premium/src/main/java/com/cms/controller/DisclosureController.java`

**Interfaces:**
- Consumes: `DisclosureService` (задача 3).
- Produces: эндпоинты из спеки, раздел 2. Точные пути (на них опираются server actions задачи 6):
  - `GET /api/cms/disclosure`
  - `GET /api/cms/documents?doctorId=`; `POST /api/cms/document`; `PATCH /api/cms/document/{id}`; `DELETE /api/cms/document/{id}` (204); `PATCH /api/cms/documents/order` (204)
  - `GET /api/cms/requisites`; `PATCH /api/cms/requisites`
  - `GET /api/cms/dms-partners`; `POST /api/cms/dms-partner`; `PATCH /api/cms/dms-partner/{id}`; `DELETE /api/cms/dms-partner/{id}` (204); `PATCH /api/cms/dms-partners/order` (204)
  - `GET /api/cms/regulators`; `POST /api/cms/regulator`; `PATCH /api/cms/regulator/{id}`; `DELETE /api/cms/regulator/{id}` (204); `PATCH /api/cms/regulators/order` (204)

Контроллер — чистая делегация; логика и её тесты — в задаче 3. Проверка — сборкой и ручным прогоном ролей.

- [ ] **Step 1: Write the controller**

```java
package com.cms.controller;

import com.cms.dto.*;
import com.cms.service.DisclosureService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Disclosure section (Government Decree No. 659). Access rules come from SecurityConfig:
 * GET is public, POST and DELETE need ADMIN, PATCH needs ADMIN or EDITOR. No PUT on
 * purpose - there is no rule for it and it would fall through to "any authenticated user".
 */
@RestController
@RequestMapping("/api/cms")
public class DisclosureController {

    private final DisclosureService service;

    public DisclosureController(DisclosureService service) {
        this.service = service;
    }

    @GetMapping("/disclosure")
    public DisclosureResponseDto disclosure() {
        return service.publicDisclosure();
    }

    // ── Documents ──

    @GetMapping("/documents")
    public List<DisclosureDocumentResponseDto> documents(@RequestParam(required = false) Integer doctorId) {
        return service.listDocuments(doctorId);
    }

    @PostMapping("/document")
    public DisclosureDocumentResponseDto createDocument(@RequestBody DisclosureDocumentRequestDto request) {
        return service.createDocument(request);
    }

    @PatchMapping("/document/{id}")
    public DisclosureDocumentResponseDto patchDocument(@PathVariable Integer id,
                                                       @RequestBody DisclosureDocumentRequestDto request) {
        return service.patchDocument(id, request);
    }

    @DeleteMapping("/document/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable Integer id) {
        service.deleteDocument(id);
    }

    @PatchMapping("/documents/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorderDocuments(@RequestBody OrderRequestDto request) {
        service.reorderDocuments(request.ids());
    }

    // ── Requisites ──

    @GetMapping("/requisites")
    public RequisitesDto requisites() {
        return service.getRequisites();
    }

    @PatchMapping("/requisites")
    public RequisitesDto patchRequisites(@RequestBody RequisitesDto request) {
        return service.patchRequisites(request);
    }

    // ── DMS partners ──

    @GetMapping("/dms-partners")
    public List<DmsPartnerDto> dmsPartners() {
        return service.listDmsPartners();
    }

    @PostMapping("/dms-partner")
    public DmsPartnerDto createDmsPartner(@RequestBody DmsPartnerDto request) {
        return service.createDmsPartner(request);
    }

    @PatchMapping("/dms-partner/{id}")
    public DmsPartnerDto patchDmsPartner(@PathVariable Integer id, @RequestBody DmsPartnerDto request) {
        return service.patchDmsPartner(id, request);
    }

    @DeleteMapping("/dms-partner/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDmsPartner(@PathVariable Integer id) {
        service.deleteDmsPartner(id);
    }

    @PatchMapping("/dms-partners/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorderDmsPartners(@RequestBody OrderRequestDto request) {
        service.reorderDmsPartners(request.ids());
    }

    // ── Regulators ──

    @GetMapping("/regulators")
    public List<RegulatorDto> regulators() {
        return service.listRegulators();
    }

    @PostMapping("/regulator")
    public RegulatorDto createRegulator(@RequestBody RegulatorDto request) {
        return service.createRegulator(request);
    }

    @PatchMapping("/regulator/{id}")
    public RegulatorDto patchRegulator(@PathVariable Integer id, @RequestBody RegulatorDto request) {
        return service.patchRegulator(id, request);
    }

    @DeleteMapping("/regulator/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRegulator(@PathVariable Integer id) {
        service.deleteRegulator(id);
    }

    @PatchMapping("/regulators/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorderRegulators(@RequestBody OrderRequestDto request) {
        service.reorderRegulators(request.ids());
    }
}
```

- [ ] **Step 2: Run the full backend suite**

Run: `cd CMS-premium && ./mvnw -q test`
Expected: PASS, все старые и новые тесты зелёные.

- [ ] **Step 3: Manual check against a running backend** (локальный Postgres и `.env`, как при обычной разработке)

Run:
```bash
cd CMS-premium && ./mvnw -q spring-boot:run &
# после старта:
curl -s localhost:8080/api/cms/disclosure
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/api/cms/document -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -w '%{http_code}\n' -X PUT localhost:8080/api/cms/requisites -H 'Content-Type: application/json' -d '{}'
```
Expected: `{"requisites":{"legalName":"",…},"documents":[],"dmsPartners":[],"regulators":[]}`; `POST` без куки → `401` или `403`; `PUT` → не `2xx`. Порт — тот, что в `.env`; остановить процесс после проверки.

- [ ] **Step 4: Commit**

```bash
git add CMS-premium/src/main/java/com/cms/controller/DisclosureController.java
git commit -m "feat(disclosure): эндпоинты раздела раскрытия информации"
```

---

### Task 5: Типы и чистые функции фронта

**Files:**
- Modify: `premium-website/lib/types.ts` (в конец)
- Modify: `premium-website/lib/disclosure.ts` (добавить функции; данные не трогать — их удаляет задача 12)
- Create: `premium-website/lib/admin/disclosure.ts`
- Modify: `premium-website/lib/admin/validation.ts` (в конец)
- Modify: `premium-website/lib/admin/draft.ts:3`
- Test: `premium-website/lib/disclosure.test.ts` (добавить блоки), `premium-website/lib/admin/disclosure.test.ts`, `premium-website/lib/admin/validation.test.ts`

**Interfaces:**
- Produces в `lib/types.ts`:
  ```ts
  export type DocumentCategory = "CONTRACT" | "PRICE_LIST" | "LICENSE" | "REGULATION" | "GUARANTEE_PROGRAM" | "OTHER" | "CERTIFICATE" | "DIPLOMA";
  export type DocumentKind = "FILE" | "LINK";
  export interface DisclosureDocument { id: number; title: string; category: DocumentCategory; kind: DocumentKind; url: string; note: string; sortOrder: number; doctorId: number | null; updatedAt: string; }
  export interface DisclosureDocumentPayload { title: string; category: DocumentCategory; kind: DocumentKind; url: string; note: string; doctorId?: number | null; }
  export interface ClinicRequisites { legalName: string; shortName: string; inn: string; kpp: string; ogrn: string; registeredAt: string; legalAddress: string; actualAddress: string; }
  export interface DmsPartner { id: number; name: string; site: string; sortOrder: number; }
  export interface Regulator { id: number; name: string; address: string; phone: string; site: string; sortOrder: number; }
  export interface Disclosure { requisites: ClinicRequisites; documents: DisclosureDocument[]; dmsPartners: DmsPartner[]; regulators: Regulator[]; }
  ```
- Produces в `lib/disclosure.ts`: `DISCLOSURE_TAG = "disclosure"`; `CLINIC_CATEGORIES: DocumentCategory[]` (порядок сайта, без `GUARANTEE_PROGRAM`, без категорий врача); `CATEGORY_LABELS: Record<DocumentCategory, string>`; `isDoctorCategory(c): boolean`; `groupDocuments(docs): { category; label; documents }[]`; `guaranteeProgram(docs): DisclosureDocument | null`; `formatRuDate(iso: string): string`.
- Produces в `lib/admin/disclosure.ts`: `REQUIRED_CATEGORIES`; `missingRequiredCategories(docs): DocumentCategory[]`; `moveId(ids: number[], id: number, delta: -1 | 1): number[] | null`; `backendErrorMessage(status: number, text: string): string`.
- Produces в `lib/admin/validation.ts`: типы полей и `validateDocument`, `validateRequisites`, `validateDmsPartner`, `validateRegulator`, `DOCUMENT_FIELD_ORDER`, `REQUISITES_FIELD_ORDER`, `isHttpsUrl`.
- Produces в `lib/admin/draft.ts`: `DraftScope` включает `"document"`.

- [ ] **Step 1: Write the failing tests**

В `lib/disclosure.test.ts` — к импорту из `./disclosure` добавить `CLINIC_CATEGORIES, formatRuDate, groupDocuments, guaranteeProgram`, строку `import type` из блока ниже поставить к остальным импортам в начало файла, остальное — в конец файла:

```ts
import type { DisclosureDocument, DocumentCategory } from "./types";

function doc(id: number, category: DocumentCategory, sortOrder = 0): DisclosureDocument {
    return {
        id,
        title: `Документ ${id}`,
        category,
        kind: "FILE",
        url: `/uploads/${id}.pdf`,
        note: "",
        sortOrder,
        doctorId: null,
        updatedAt: "2026-09-30T12:00:00",
    };
}

describe("groupDocuments", () => {
    it("раскладывает по категориям в порядке сайта и сохраняет порядок внутри", () => {
        const groups = groupDocuments([
            doc(1, "OTHER"),
            doc(2, "PRICE_LIST", 1),
            doc(3, "CONTRACT"),
            doc(4, "PRICE_LIST", 0),
        ]);
        expect(groups.map((g) => g.category)).toEqual(["CONTRACT", "PRICE_LIST", "OTHER"]);
        expect(groups[1].documents.map((d) => d.id)).toEqual([4, 2]);
        expect(groups[0].label).toBe("Договор");
    });

    it("не выводит программу госгарантий и документы врачей", () => {
        const groups = groupDocuments([doc(1, "GUARANTEE_PROGRAM"), doc(2, "CERTIFICATE"), doc(3, "DIPLOMA")]);
        expect(groups).toEqual([]);
    });

    it("CLINIC_CATEGORIES не содержит категорий врача", () => {
        expect(CLINIC_CATEGORIES).not.toContain("CERTIFICATE");
        expect(CLINIC_CATEGORIES).not.toContain("DIPLOMA");
    });
});

describe("guaranteeProgram", () => {
    it("берёт первый документ программы госгарантий", () => {
        expect(guaranteeProgram([doc(1, "CONTRACT"), doc(5, "GUARANTEE_PROGRAM", 1), doc(6, "GUARANTEE_PROGRAM", 0)])?.id).toBe(6);
    });

    it("null, если программы нет", () => {
        expect(guaranteeProgram([doc(1, "CONTRACT")])).toBeNull();
    });
});

describe("formatRuDate", () => {
    it("дата и дата-время ISO → ДД.ММ.ГГГГ без сдвига часового пояса", () => {
        expect(formatRuDate("2022-09-06")).toBe("06.09.2022");
        expect(formatRuDate("2026-09-30T23:59:59.123")).toBe("30.09.2026");
    });

    it("пустое и мусор → пустая строка", () => {
        expect(formatRuDate("")).toBe("");
        expect(formatRuDate("06.09.2022")).toBe("");
    });
});
```

`lib/admin/disclosure.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { DisclosureDocument, DocumentCategory } from "@/lib/types";
import { backendErrorMessage, missingRequiredCategories, moveId } from "./disclosure";

function doc(id: number, category: DocumentCategory): DisclosureDocument {
    return {
        id,
        title: "Документ",
        category,
        kind: "FILE",
        url: `/uploads/${id}.pdf`,
        note: "",
        sortOrder: 0,
        doctorId: null,
        updatedAt: "",
    };
}

describe("missingRequiredCategories", () => {
    it("пустой раздел — не хватает всех обязательных, в порядке сайта", () => {
        expect(missingRequiredCategories([])).toEqual([
            "CONTRACT",
            "PRICE_LIST",
            "LICENSE",
            "REGULATION",
            "GUARANTEE_PROGRAM",
        ]);
    });

    it("«Прочее» и документы врачей обязательных не закрывают", () => {
        expect(missingRequiredCategories([doc(1, "OTHER"), doc(2, "CERTIFICATE")])).toHaveLength(5);
    });

    it("всё на месте — пусто", () => {
        const all: DocumentCategory[] = ["CONTRACT", "PRICE_LIST", "LICENSE", "REGULATION", "GUARANTEE_PROGRAM"];
        expect(missingRequiredCategories(all.map((c, i) => doc(i, c)))).toEqual([]);
    });
});

describe("moveId", () => {
    it("сдвигает вверх и вниз", () => {
        expect(moveId([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
        expect(moveId([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    });

    it("за край и неизвестный id — null, запрос не нужен", () => {
        expect(moveId([1, 2, 3], 1, -1)).toBeNull();
        expect(moveId([1, 2, 3], 3, 1)).toBeNull();
        expect(moveId([1, 2, 3], 9, 1)).toBeNull();
    });
});

describe("backendErrorMessage", () => {
    it("400 — текст бэкенда без служебного префикса", () => {
        expect(backendErrorMessage(400, "Invalid input: ИНН — 10 цифр")).toBe("ИНН — 10 цифр");
        expect(backendErrorMessage(400, "Файл не PDF")).toBe("Файл не PDF");
    });

    it("права и отсутствие — понятные фразы вместо английского", () => {
        expect(backendErrorMessage(401, "Invalid credentials")).toBe("Сессия истекла — войдите заново");
        expect(backendErrorMessage(403, "Access denied")).toBe("Недостаточно прав для этого действия");
        expect(backendErrorMessage(404, "Документ не найден")).toBe("Документ не найден");
    });

    it("500 и пустой ответ — общая фраза", () => {
        expect(backendErrorMessage(500, "Internal server error")).toBe("Ошибка сервера — попробуйте позже");
        expect(backendErrorMessage(400, "")).toBe("Запрос отклонён сервером");
    });
});
```

`lib/admin/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ClinicRequisites, DisclosureDocumentPayload } from "@/lib/types";
import {
    isHttpsUrl,
    validateDmsPartner,
    validateDocument,
    validateRegulator,
    validateRequisites,
} from "./validation";

const FILE: DisclosureDocumentPayload = {
    title: "Прейскурант цен",
    category: "PRICE_LIST",
    kind: "FILE",
    url: "/uploads/0b8e7c1a-2f4d-4a55-9d0e-3c1b2a4f5e6d.pdf",
    note: "",
};

const REQUISITES: ClinicRequisites = {
    legalName: "Общество с ограниченной ответственностью «ПРЕМИУМ»",
    shortName: "ООО «ПРЕМИУМ»",
    inn: "0276970983",
    kpp: "027401001",
    ogrn: "1220200030710",
    registeredAt: "2022-09-06",
    legalAddress: "450018, г. Уфа",
    actualAddress: "450018, г. Уфа",
};

describe("validateDocument", () => {
    it("корректный файл и корректная ссылка проходят", () => {
        expect(validateDocument(FILE)).toEqual({});
        expect(validateDocument({ ...FILE, kind: "LINK", url: "https://health.bashkortostan.ru" })).toEqual({});
    });

    it("нет названия и не загружен файл", () => {
        const errors = validateDocument({ ...FILE, title: "  ", url: "" });
        expect(errors.title).toBeDefined();
        expect(errors.url).toBe("Загрузите PDF");
    });

    it("ссылка не https", () => {
        expect(validateDocument({ ...FILE, kind: "LINK", url: "javascript:alert(1)" }).url).toContain("https://");
    });

    it("примечание длиннее 500", () => {
        expect(validateDocument({ ...FILE, note: "x".repeat(501) }).note).toBeDefined();
    });
});

describe("validateRequisites", () => {
    it("реальные реквизиты и пустая форма проходят", () => {
        expect(validateRequisites(REQUISITES)).toEqual({});
        expect(validateRequisites({ ...REQUISITES, inn: "", kpp: "", ogrn: "", registeredAt: "" })).toEqual({});
    });

    it("пробелы по краям не ошибка — бэкенд их обрежет", () => {
        expect(validateRequisites({ ...REQUISITES, inn: " 0276970983 " })).toEqual({});
    });

    it("пробел внутри, буквы и неверная длина — ошибка у своего поля", () => {
        const errors = validateRequisites({ ...REQUISITES, inn: "0276 970983", kpp: "02740100", ogrn: "122020003071O" });
        expect(errors.inn).toBe("ИНН — 10 цифр");
        expect(errors.kpp).toBe("КПП — 9 цифр");
        expect(errors.ogrn).toBe("ОГРН — 13 цифр");
    });
});

describe("validateDmsPartner / validateRegulator", () => {
    it("название обязательно, сайт — пусто или https", () => {
        expect(validateDmsPartner({ name: "", site: "" }).name).toBeDefined();
        expect(validateDmsPartner({ name: "СОГАЗ", site: "sogaz.ru" }).site).toBeDefined();
        expect(validateDmsPartner({ name: "СОГАЗ", site: "" })).toEqual({});
        expect(validateRegulator({ name: "Минздрав РБ", address: "", phone: "", site: "https://health.bashkortostan.ru" })).toEqual({});
    });
});

describe("isHttpsUrl", () => {
    it("только https с хостом", () => {
        expect(isHttpsUrl("https://02.rospotrebnadzor.ru")).toBe(true);
        expect(isHttpsUrl("http://02.rospotrebnadzor.ru")).toBe(false);
        expect(isHttpsUrl("https://")).toBe(false);
        expect(isHttpsUrl("не ссылка")).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd premium-website && npx vitest run lib/disclosure.test.ts lib/admin`
Expected: FAIL — `groupDocuments is not a function` / не находится `./disclosure` в `lib/admin`.

- [ ] **Step 3: Write minimal implementation**

В конец `lib/types.ts`:

```ts
/**
 * Раздел раскрытия информации. Зеркало DTO бэкенда: строковые поля приходят
 * пустой строкой, а не null, — витрине не нужно проверять каждое поле.
 */
export type DocumentCategory =
    | "CONTRACT"
    | "PRICE_LIST"
    | "LICENSE"
    | "REGULATION"
    | "GUARANTEE_PROGRAM"
    | "OTHER"
    | "CERTIFICATE"
    | "DIPLOMA";

export type DocumentKind = "FILE" | "LINK";

export interface DisclosureDocument {
    id: number;
    title: string;
    category: DocumentCategory;
    kind: DocumentKind;
    /** `/uploads/<uuid>.pdf` для FILE, `https://…` для LINK. */
    url: string;
    note: string;
    sortOrder: number;
    /** null — документ клиники. */
    doctorId: number | null;
    /** ISO LocalDateTime без зоны, например `2026-09-30T12:00:00`. */
    updatedAt: string;
}

export interface DisclosureDocumentPayload {
    title: string;
    category: DocumentCategory;
    kind: DocumentKind;
    url: string;
    note: string;
    doctorId?: number | null;
}

export interface ClinicRequisites {
    legalName: string;
    shortName: string;
    inn: string;
    kpp: string;
    ogrn: string;
    /** `YYYY-MM-DD` или пустая строка. */
    registeredAt: string;
    legalAddress: string;
    actualAddress: string;
}

export interface DmsPartner {
    id: number;
    name: string;
    site: string;
    sortOrder: number;
}

export interface Regulator {
    id: number;
    name: string;
    address: string;
    phone: string;
    site: string;
    sortOrder: number;
}

export interface Disclosure {
    requisites: ClinicRequisites;
    documents: DisclosureDocument[];
    dmsPartners: DmsPartner[];
    regulators: Regulator[];
}
```

В `lib/disclosure.ts` — импорт типов вверху (`import type { DisclosureDocument, DocumentCategory } from "./types";`) и в конец файла:

```ts
/** Тег кеша данных раздела: админка сбрасывает его после каждого изменения. */
export const DISCLOSURE_TAG = "disclosure";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    CONTRACT: "Договор",
    PRICE_LIST: "Прейскурант",
    LICENSE: "Лицензия",
    REGULATION: "Нормативные акты",
    GUARANTEE_PROGRAM: "Программа госгарантий",
    OTHER: "Прочие документы",
    CERTIFICATE: "Сертификат",
    DIPLOMA: "Диплом",
};

/**
 * Категории списка «Документы» в порядке показа — тот же порядок, что у
 * перечисления на бэкенде. Программа госгарантий выводится в блоке ОМС.
 */
export const CLINIC_CATEGORIES: DocumentCategory[] = [
    "CONTRACT",
    "PRICE_LIST",
    "LICENSE",
    "REGULATION",
    "OTHER",
];

export function isDoctorCategory(category: DocumentCategory): boolean {
    return category === "CERTIFICATE" || category === "DIPLOMA";
}

export interface DocumentGroup {
    category: DocumentCategory;
    label: string;
    documents: DisclosureDocument[];
}

/** Непустые группы списка «Документы»; порядок внутри — по sortOrder. */
export function groupDocuments(documents: DisclosureDocument[]): DocumentGroup[] {
    return CLINIC_CATEGORIES.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        documents: documents
            .filter((d) => d.category === category && d.doctorId === null)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    })).filter((group) => group.documents.length > 0);
}

export function guaranteeProgram(documents: DisclosureDocument[]): DisclosureDocument | null {
    const found = documents
        .filter((d) => d.category === "GUARANTEE_PROGRAM" && d.doctorId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return found[0] ?? null;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Строковый разбор, а не Date: бэкенд отдаёт время без зоны, и new Date()
 * сдвинул бы дату у документа, обновлённого около полуночи.
 */
export function formatRuDate(iso: string): string {
    const match = ISO_DATE_RE.exec(iso);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}
```

`lib/admin/disclosure.ts`:

```ts
/** Правила экрана «Раскрытие информации» в админке. Чистые функции. */

import type { DisclosureDocument, DocumentCategory } from "@/lib/types";

/** Без документа этих категорий раздел не соответствует Постановлению № 659. */
export const REQUIRED_CATEGORIES: DocumentCategory[] = [
    "CONTRACT",
    "PRICE_LIST",
    "LICENSE",
    "REGULATION",
    "GUARANTEE_PROGRAM",
];

export function missingRequiredCategories(documents: DisclosureDocument[]): DocumentCategory[] {
    const present = new Set(documents.filter((d) => d.doctorId === null).map((d) => d.category));
    return REQUIRED_CATEGORIES.filter((category) => !present.has(category));
}

/** Новый порядок после сдвига строки; null — двигать некуда, запрос не нужен. */
export function moveId(ids: number[], id: number, delta: -1 | 1): number[] | null {
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return null;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
}

const INVALID_PREFIX = "Invalid input: ";

/**
 * Текст ответа бэкенда → фраза для тоста или поля. Сообщения 400 и 404
 * бэкенд раздела пишет по-русски для редактора; 401/403/5xx приходят
 * по-английски из GlobalExceptionHandler и заменяются.
 */
export function backendErrorMessage(status: number, text: string): string {
    if (status === 401) return "Сессия истекла — войдите заново";
    if (status === 403) return "Недостаточно прав для этого действия";
    if (status >= 500) return "Ошибка сервера — попробуйте позже";
    const message = text.startsWith(INVALID_PREFIX) ? text.slice(INVALID_PREFIX.length) : text;
    return message.trim() || "Запрос отклонён сервером";
}
```

В конец `lib/admin/validation.ts` (и расширить импорт типов: `import type { ClinicRequisites, DisclosureDocumentPayload, DmsPartner, DoctorPayload, Regulator, ServicePayload } from "@/lib/types";`):

```ts
export const DOCUMENT_TITLE_MAX = 300;
export const DOCUMENT_NOTE_MAX = 500;

export type DocumentField = "category" | "title" | "url" | "note";
export const DOCUMENT_FIELD_ORDER: DocumentField[] = ["category", "title", "url", "note"];

export type RequisitesField = keyof ClinicRequisites;
export const REQUISITES_FIELD_ORDER: RequisitesField[] = [
    "legalName",
    "shortName",
    "inn",
    "kpp",
    "ogrn",
    "registeredAt",
    "legalAddress",
    "actualAddress",
];

const FILE_URL_RE = /^\/uploads\/[0-9A-Za-z-]+\.pdf$/;
const REGISTERED_AT_RE = /^\d{4}-\d{2}-\d{2}$/;
const CODES: [RequisitesField, RegExp, string][] = [
    ["inn", /^\d{10}$/, "ИНН — 10 цифр"],
    ["kpp", /^\d{9}$/, "КПП — 9 цифр"],
    ["ogrn", /^\d{13}$/, "ОГРН — 13 цифр"],
];

/** Те же правила, что у DisclosureValidator на бэкенде: https и есть хост. */
export function isHttpsUrl(raw: string): boolean {
    try {
        const url = new URL(raw);
        return url.protocol === "https:" && url.hostname.length > 0;
    } catch {
        return false;
    }
}

export function validateDocument(v: DisclosureDocumentPayload): FieldErrors<DocumentField> {
    const errors: FieldErrors<DocumentField> = {};
    if (!v.title.trim()) errors.title = "Укажите название документа";
    else if (v.title.length > DOCUMENT_TITLE_MAX) errors.title = `Не длиннее ${DOCUMENT_TITLE_MAX} символов`;
    if (v.note.length > DOCUMENT_NOTE_MAX) errors.note = `Не длиннее ${DOCUMENT_NOTE_MAX} символов`;

    const url = v.url.trim();
    if (v.kind === "FILE") {
        if (!url) errors.url = "Загрузите PDF";
        else if (!FILE_URL_RE.test(url)) errors.url = "Файл должен быть загружен через админку";
    } else if (!isHttpsUrl(url)) {
        errors.url = "Ссылка должна начинаться с https://";
    }
    return errors;
}

export function validateRequisites(v: ClinicRequisites): FieldErrors<RequisitesField> {
    const errors: FieldErrors<RequisitesField> = {};
    for (const [field, re, message] of CODES) {
        const value = v[field].trim();
        if (value && !re.test(value)) errors[field] = message;
    }
    const date = v.registeredAt.trim();
    if (date && !REGISTERED_AT_RE.test(date)) errors.registeredAt = "Дата в формате ГГГГ-ММ-ДД";
    return errors;
}

export type ListItemField = "name" | "site";

export function validateDmsPartner(v: Pick<DmsPartner, "name" | "site">): FieldErrors<ListItemField> {
    const errors: FieldErrors<ListItemField> = {};
    if (!v.name.trim()) errors.name = "Укажите название страховой компании";
    if (v.site.trim() && !isHttpsUrl(v.site.trim())) errors.site = "Сайт должен начинаться с https://";
    return errors;
}

export function validateRegulator(
    v: Pick<Regulator, "name" | "address" | "phone" | "site">,
): FieldErrors<ListItemField> {
    const errors: FieldErrors<ListItemField> = {};
    if (!v.name.trim()) errors.name = "Укажите название органа";
    if (v.site.trim() && !isHttpsUrl(v.site.trim())) errors.site = "Сайт должен начинаться с https://";
    return errors;
}
```

В `lib/admin/draft.ts:3`:

```ts
export type DraftScope = "service" | "doctor" | "document";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd premium-website && npx vitest run && npx tsc --noEmit -p .`
Expected: все тесты PASS, `tsc` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add premium-website/lib/types.ts premium-website/lib/disclosure.ts premium-website/lib/disclosure.test.ts premium-website/lib/admin/disclosure.ts premium-website/lib/admin/disclosure.test.ts premium-website/lib/admin/validation.ts premium-website/lib/admin/validation.test.ts premium-website/lib/admin/draft.ts
git commit -m "feat(disclosure): типы раздела и чистые функции витрины и админки"
```

---

### Task 6: Server actions и прокси загрузки PDF

**Files:**
- Create: `premium-website/app/(admin)/admin/disclosure/actions.ts`
- Create: `premium-website/app/api/admin/upload-document/route.ts`

**Interfaces:**
- Consumes: эндпоинты задачи 4, `backendErrorMessage` и `DISCLOSURE_TAG` из задачи 5.
- Produces (`actions.ts`):
  ```ts
  export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
  actionLoadDisclosure(): Promise<ActionResult<Disclosure>>
  actionCreateDocument(p: DisclosureDocumentPayload): Promise<ActionResult<DisclosureDocument>>
  actionPatchDocument(id: number, p: Partial<DisclosureDocumentPayload>): Promise<ActionResult<DisclosureDocument>>
  actionDeleteDocument(id: number): Promise<ActionResult<null>>
  actionReorderDocuments(ids: number[]): Promise<ActionResult<null>>
  actionPatchRequisites(p: Partial<ClinicRequisites>): Promise<ActionResult<ClinicRequisites>>
  actionCreateDmsPartner(p: { name: string; site: string }): Promise<ActionResult<DmsPartner>>
  actionPatchDmsPartner(id: number, p: Partial<{ name: string; site: string }>): Promise<ActionResult<DmsPartner>>
  actionDeleteDmsPartner(id: number): Promise<ActionResult<null>>
  actionReorderDmsPartners(ids: number[]): Promise<ActionResult<null>>
  actionCreateRegulator(p: RegulatorFields): Promise<ActionResult<Regulator>>
  actionPatchRegulator(id: number, p: Partial<RegulatorFields>): Promise<ActionResult<Regulator>>
  actionDeleteRegulator(id: number): Promise<ActionResult<null>>
  actionReorderRegulators(ids: number[]): Promise<ActionResult<null>>
  ```
  где `RegulatorFields = { name: string; address: string; phone: string; site: string }`.
- Produces (route handler): `POST /api/admin/upload-document` (тело — multipart как есть) → статус и тело бэкенда; при `content-length` > 32 МБ — 413 без обращения к бэкенду; при недоступном бэкенде — 502 с текстом.

`actionLoadDisclosure` читает админские данные без кеша (`cache: "no-store"`): после правки админ должен видеть свежую запись, а не кеш витрины.

- [ ] **Step 1: Write the server actions**

```ts
"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { backendErrorMessage } from "@/lib/admin/disclosure";
import { DISCLOSURE_TAG } from "@/lib/disclosure";
import type {
    ClinicRequisites,
    Disclosure,
    DisclosureDocument,
    DisclosureDocumentPayload,
    DmsPartner,
    Regulator,
} from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_URL!;

/**
 * Результат вместо null, как в соседнем admin/actions.ts: здесь текст ошибки
 * бэкенда (неверный ИНН, «список устарел») нужен у поля, а не только в логе.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type RegulatorFields = { name: string; address: string; phone: string; site: string };
type PartnerFields = { name: string; site: string };

async function cookieHeader() {
    const store = await cookies();
    return store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
}

async function send<T>(path: string, method: string, body?: unknown): Promise<ActionResult<T>> {
    let r: Response;
    try {
        r = await fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: {
                accept: "application/json",
                cookie: await cookieHeader(),
                ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
            cache: "no-store",
        });
    } catch (error) {
        console.error(`CMS ${method} ${path} недоступен`, error);
        return { ok: false, error: "Сервер недоступен — проверьте соединение" };
    }

    if (!r.ok) {
        const text = await r.text().catch(() => "");
        console.error(`CMS ${method} ${path} → ${r.status}`, text);
        return { ok: false, error: backendErrorMessage(r.status, text) };
    }
    if (r.status === 204) return { ok: true, data: null as T };
    return { ok: true, data: (await r.json()) as T };
}

/**
 * Изменение сразу помечает кеш витрины просроченным: следующий посетитель
 * /documents получит свежие данные, а не версию часовой давности.
 */
async function mutate<T>(path: string, method: string, body?: unknown): Promise<ActionResult<T>> {
    const result = await send<T>(path, method, body);
    if (result.ok) revalidateTag(DISCLOSURE_TAG, { expire: 0 });
    return result;
}

export async function actionLoadDisclosure(): Promise<ActionResult<Disclosure>> {
    return send<Disclosure>("/api/cms/disclosure", "GET");
}

export async function actionCreateDocument(p: DisclosureDocumentPayload) {
    return mutate<DisclosureDocument>("/api/cms/document", "POST", p);
}

export async function actionPatchDocument(id: number, p: Partial<DisclosureDocumentPayload>) {
    return mutate<DisclosureDocument>(`/api/cms/document/${id}`, "PATCH", p);
}

export async function actionDeleteDocument(id: number) {
    return mutate<null>(`/api/cms/document/${id}`, "DELETE");
}

export async function actionReorderDocuments(ids: number[]) {
    return mutate<null>("/api/cms/documents/order", "PATCH", { ids });
}

export async function actionPatchRequisites(p: Partial<ClinicRequisites>) {
    return mutate<ClinicRequisites>("/api/cms/requisites", "PATCH", p);
}

export async function actionCreateDmsPartner(p: PartnerFields) {
    return mutate<DmsPartner>("/api/cms/dms-partner", "POST", p);
}

export async function actionPatchDmsPartner(id: number, p: Partial<PartnerFields>) {
    return mutate<DmsPartner>(`/api/cms/dms-partner/${id}`, "PATCH", p);
}

export async function actionDeleteDmsPartner(id: number) {
    return mutate<null>(`/api/cms/dms-partner/${id}`, "DELETE");
}

export async function actionReorderDmsPartners(ids: number[]) {
    return mutate<null>("/api/cms/dms-partners/order", "PATCH", { ids });
}

export async function actionCreateRegulator(p: RegulatorFields) {
    return mutate<Regulator>("/api/cms/regulator", "POST", p);
}

export async function actionPatchRegulator(id: number, p: Partial<RegulatorFields>) {
    return mutate<Regulator>(`/api/cms/regulator/${id}`, "PATCH", p);
}

export async function actionDeleteRegulator(id: number) {
    return mutate<null>(`/api/cms/regulator/${id}`, "DELETE");
}

export async function actionReorderRegulators(ids: number[]) {
    return mutate<null>("/api/cms/regulators/order", "PATCH", { ids });
}
```

- [ ] **Step 2: Write the upload route handler**

```ts
import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL!;

/** Бэкенд режет на 32 МБ (max-request-size); незачем гнать больше по сети. */
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;

/**
 * Прокси загрузки PDF. Не server action: у actions общий лимит тела 6 МБ
 * (next.config.ts), и тело там целиком лежит в памяти. Здесь поток уходит
 * на бэкенд как есть. Права проверяет только бэкенд — по куке, которую мы
 * пробрасываем; middleware.ts этот путь не охраняет (matcher — только /admin и /login).
 */
export const POST = async (req: NextRequest) => {
    const length = Number(req.headers.get("content-length") ?? "0");
    if (length > MAX_REQUEST_BYTES) {
        return new NextResponse("Файл больше 30 МБ", { status: 413 });
    }

    let r: Response;
    try {
        r = await fetch(`${BACKEND_URL}/api/cms/media/document`, {
            method: "POST",
            headers: {
                "content-type": req.headers.get("content-type") ?? "",
                cookie: req.headers.get("cookie") ?? "",
            },
            body: req.body,
            // Без duplex Node-овый fetch отказывается отправлять поток.
            duplex: "half",
            cache: "no-store",
        } as RequestInit & { duplex: "half" });
    } catch (error) {
        console.error("CMS upload-document недоступен", error);
        return new NextResponse("Сервер недоступен", { status: 502 });
    }

    return new NextResponse(await r.text(), {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") ?? "text/plain; charset=utf-8" },
    });
};
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd premium-website && npx tsc --noEmit -p . && npx eslint "app/(admin)/admin/disclosure/actions.ts" app/api/admin/upload-document/route.ts`
Expected: без ошибок.

- [ ] **Step 4: Manual check of the proxy** (бэкенд запущен, `npm run dev`, вход в админку выполнен в браузере; `ACCESS` — значение куки `access_token` из DevTools)

Run:
```bash
printf '%%PDF-1.4\n%%%%EOF' > /tmp/t.pdf
curl -s -F file=@/tmp/t.pdf -H "cookie: access_token=$ACCESS" localhost:3000/api/admin/upload-document
curl -s -o /dev/null -w '%{http_code}\n' -F file=@/tmp/t.pdf localhost:3000/api/admin/upload-document
```
Expected: `{"url":"/uploads/<uuid>.pdf","size":"…"}`; без куки — `401` или `403`.

- [ ] **Step 5: Commit**

```bash
git add "premium-website/app/(admin)/admin/disclosure/actions.ts" premium-website/app/api/admin/upload-document/route.ts
git commit -m "feat(disclosure): server actions раздела и стримящий прокси загрузки PDF"
```

---

### Task 7: `FileDropzone`

**Files:**
- Create: `premium-website/app/(admin)/admin/components/ui/FileDropzone.tsx`
- Create: `premium-website/app/(admin)/admin/components/ui/FileDropzone.module.css`
- Modify: `premium-website/lib/admin/disclosure.ts` (добавить `checkPdfFile`, `formatBytes`)
- Test: `premium-website/lib/admin/disclosure.test.ts` (добавить блоки)

**Interfaces:**
- Consumes: `POST /api/admin/upload-document` (задача 6), `backendErrorMessage` (задача 5).
- Produces: `lib/admin/disclosure.ts` — `PDF_MAX_BYTES = 30 * 1024 * 1024`; `checkPdfFile(f: { name: string; type: string; size: number }): string | null` (текст ошибки или null); `formatBytes(n: number): string`.
- Produces: `<FileDropzone id label value error onUploaded onError />`, где `value: string` — текущий url, `onUploaded(url: string, fileName: string, size: number)`, `onError(message: string)`, `error?: string` — ошибка поля.

- [ ] **Step 1: Write the failing test** (в конец `lib/admin/disclosure.test.ts`; импорт расширить `checkPdfFile, formatBytes`)

```ts
describe("checkPdfFile", () => {
    it("PDF до 30 МБ проходит, в том числе с пустым MIME и расширением в верхнем регистре", () => {
        expect(checkPdfFile({ name: "price.pdf", type: "application/pdf", size: 1024 })).toBeNull();
        expect(checkPdfFile({ name: "LICENSE.PDF", type: "", size: 1024 })).toBeNull();
    });

    it("не PDF и слишком большой файл — текст ошибки", () => {
        expect(checkPdfFile({ name: "scan.jpg", type: "image/jpeg", size: 10 })).toBe("Подойдёт только PDF");
        expect(checkPdfFile({ name: "scan.pdf", type: "application/pdf", size: 30 * 1024 * 1024 + 1 })).toBe(
            "Файл больше 30 МБ",
        );
        expect(checkPdfFile({ name: "empty.pdf", type: "application/pdf", size: 0 })).toBe("Файл пустой");
    });
});

describe("formatBytes", () => {
    it("КБ и МБ с одним знаком", () => {
        expect(formatBytes(512)).toBe("1 КБ");
        expect(formatBytes(4_162_290)).toBe("4,0 МБ");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd premium-website && npx vitest run lib/admin/disclosure.test.ts`
Expected: FAIL — `checkPdfFile is not a function`.

- [ ] **Step 3: Write minimal implementation**

В конец `lib/admin/disclosure.ts`:

```ts
export const PDF_MAX_BYTES = 30 * 1024 * 1024;

/**
 * Проверка до отправки — чтобы не гнать 30 МБ ради отказа. Окончательно
 * решает бэкенд по сигнатуре файла; MIME в браузере бывает пустым, поэтому
 * достаточно расширения.
 */
export function checkPdfFile(file: { name: string; type: string; size: number }): string | null {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Подойдёт только PDF";
    if (file.size === 0) return "Файл пустой";
    if (file.size > PDF_MAX_BYTES) return "Файл больше 30 МБ";
    return null;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}
```

`FileDropzone.tsx`:

```tsx
"use client";

import { type DragEvent, useRef, useState } from "react";
import { FiFileText, FiUploadCloud } from "react-icons/fi";
import { backendErrorMessage, checkPdfFile, formatBytes } from "@/lib/admin/disclosure";
import Button from "./Button";
import styles from "./FileDropzone.module.css";

type Uploaded = { name: string; size: number };

/**
 * Загрузка PDF для раздела раскрытия. Отдельно от Dropzone картинок: другой
 * путь (route handler, а не server action — файлы до 30 МБ), нет превью,
 * вместо него — имя и размер загруженного файла.
 */
export default function FileDropzone({
    id,
    label,
    value,
    error,
    onUploaded,
    onError,
}: {
    id: string;
    label: string;
    value: string;
    error?: string;
    onUploaded: (url: string, fileName: string, size: number) => void;
    onError: (message: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    const [busy, setBusy] = useState(false);
    const [uploaded, setUploaded] = useState<Uploaded | null>(null);

    async function upload(file: File) {
        const problem = checkPdfFile(file);
        if (problem) return onError(problem);
        setBusy(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const r = await fetch("/api/admin/upload-document", { method: "POST", body });
            const text = await r.text();
            if (!r.ok) return onError(backendErrorMessage(r.status, text));
            const { url } = JSON.parse(text) as { url: string };
            setUploaded({ name: file.name, size: file.size });
            onUploaded(url, file.name, file.size);
        } catch {
            onError("Сеть недоступна — файл не загрузился");
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
    }

    const errorId = `${id}-error`;

    return (
        <div className={styles.field}>
            <span className={styles.label} id={`${id}-label`}>{label}</span>
            <div
                className={`${styles.zone} ${over ? styles.over : ""} ${error ? styles.invalid : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
                aria-busy={busy}
            >
                {value ? (
                    <div className={styles.current}>
                        <FiFileText aria-hidden="true" />
                        <span className={styles.fileName}>
                            {uploaded ? `${uploaded.name} · ${formatBytes(uploaded.size)}` : "Файл загружен"}
                        </span>
                        <a href={value} target="_blank" rel="noreferrer" className={styles.open}>
                            Открыть
                        </a>
                    </div>
                ) : (
                    <div className={styles.hint}>
                        <FiUploadCloud aria-hidden="true" />
                        <span>Перетащите PDF сюда — до 30 МБ</span>
                    </div>
                )}
                <Button
                    id={id}
                    size="sm"
                    variant="ghost"
                    loading={busy}
                    busyLabel="Загружаем…"
                    onClick={() => inputRef.current?.click()}
                    aria-describedby={error ? errorId : undefined}
                    aria-labelledby={`${id}-label ${id}`}
                >
                    {value ? "Заменить файл" : "Выбрать файл"}
                </Button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file);
                    }}
                />
            </div>
            {error ? (
                <p id={errorId} role="alert" className={styles.error}>{error}</p>
            ) : null}
        </div>
    );
}
```

`FileDropzone.module.css` — стили копируют токены `Dropzone.module.css` (открыть его и взять те же `--glass-*`, `--radius-*`, `--ink-soft`, `--danger`); минимально:

```css
.field { display: grid; gap: 6px; }

.label { font-size: 12px; font-weight: 600; color: var(--ink-soft); }

.zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px dashed var(--glass-dark-border);
  border-radius: var(--radius-sm);
  transition: border-color 160ms ease, background-color 160ms ease;
}

.over { border-color: var(--brass-bright); background: color-mix(in srgb, var(--brass-bright) 8%, transparent); }

.invalid { border-color: var(--danger); }

.hint, .current { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; color: var(--ink-soft); }

.fileName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }

.open { font-size: 12px; white-space: nowrap; }

.error { margin: 0; font-size: 12px; color: var(--danger); }

@media (prefers-reduced-motion: reduce) {
  .zone { transition: none; }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `cd premium-website && npx vitest run lib/admin && npx tsc --noEmit -p .`
Expected: PASS, `tsc` без ошибок. Токены, которых нет в `Dropzone.module.css`, заменить на существующие оттуда — проверить `grep -o "var(--[a-z-]*)" "app/(admin)/admin/components/ui/Dropzone.module.css" | sort -u`.

- [ ] **Step 5: Commit**

```bash
git add "premium-website/app/(admin)/admin/components/ui/FileDropzone.tsx" "premium-website/app/(admin)/admin/components/ui/FileDropzone.module.css" premium-website/lib/admin/disclosure.ts premium-website/lib/admin/disclosure.test.ts
git commit -m "feat(admin): FileDropzone — загрузка PDF до 30 МБ через route handler"
```

---

### Task 8: Состояние раздела, экран с вкладками и пункт меню

**Files:**
- Create: `premium-website/app/(admin)/admin/components/data/DisclosureDataProvider.tsx`
- Create: `premium-website/app/(admin)/admin/disclosure/page.tsx`
- Create: `premium-website/app/(admin)/admin/disclosure/disclosure.module.css`
- Modify: `premium-website/app/(admin)/admin/layout.tsx` (обернуть в провайдер)
- Modify: `premium-website/app/(admin)/admin/components/shell/Sidebar.tsx:5,16-20,38,50-54`

**Interfaces:**
- Consumes: actions задачи 6; `useToast` (существующий).
- Produces: `useDisclosureData(): DisclosureData`, где
  ```ts
  type DisclosureData = {
      data: Disclosure | null;          // null — ещё не загружено
      loading: boolean;
      busy: boolean;                    // идёт изменение — кнопки ↑/↓ блокируются
      reload: () => Promise<void>;
      run: <T>(action: () => Promise<ActionResult<T>>, success: string) => Promise<ActionResult<T>>;
  };
  ```
  `run` выполняет изменение, при успехе перечитывает весь раздел (он маленький — проще, чем сводить оптимистичные операции для четырёх коллекций) и показывает тост `success`; при ошибке — тост с текстом ошибки, при «устарел» дополнительно перечитывает. Возвращает результат, чтобы форма могла вывести ошибку у поля.
- Produces: страница `/admin/disclosure?tab=documents|requisites|dms|regulators`. В этой задаче каждая вкладка выводит абзац с числом записей — так экран, провайдер и меню проверяются отдельно; задачи 9, 10 и 11 заменяют абзац своей вкладки компонентом.

- [ ] **Step 1: Write the provider**

```tsx
"use client";

import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import type { Disclosure } from "@/lib/types";
import { type ActionResult, actionLoadDisclosure } from "../../disclosure/actions";
import { useToast } from "../ui/ToastProvider";

export type DisclosureData = {
    data: Disclosure | null;
    loading: boolean;
    busy: boolean;
    reload: () => Promise<void>;
    run: <T>(action: () => Promise<ActionResult<T>>, success: string) => Promise<ActionResult<T>>;
};

const DisclosureContext = createContext<DisclosureData | null>(null);

export function useDisclosureData(): DisclosureData {
    const ctx = useContext(DisclosureContext);
    if (!ctx) throw new Error("useDisclosureData вызван вне DisclosureDataProvider");
    return ctx;
}

/**
 * Состояние раздела раскрытия. Без оптимистичных операций, в отличие от
 * AdminDataProvider: записей десятки, а ошибка здесь — это юридически
 * неверная страница, поэтому экран показывает только подтверждённое сервером.
 */
export default function DisclosureDataProvider({ children }: { children: ReactNode }) {
    const { push } = useToast();
    const [data, setData] = useState<Disclosure | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    async function reload() {
        setLoading(true);
        const result = await actionLoadDisclosure().catch(() => null);
        setLoading(false);
        if (result?.ok) return setData(result.data);
        push({
            tone: "error",
            title: result?.error ?? "Не удалось загрузить раздел",
            action: { label: "Повторить", onClick: () => void reload() },
        });
    }

    useEffect(() => {
        void reload();
        // Загрузка один раз при монтировании каркаса.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function run<T>(action: () => Promise<ActionResult<T>>, success: string) {
        setBusy(true);
        let result: ActionResult<T>;
        try {
            result = await action();
        } catch {
            result = { ok: false, error: "Сеть недоступна — изменения не сохранены" };
        }
        setBusy(false);
        if (result.ok) {
            push({ tone: "success", title: success });
            await reload();
        } else {
            push({ tone: "error", title: result.error });
            if (result.error.includes("устарел")) await reload();
        }
        return result;
    }

    const value: DisclosureData = { data, loading, busy, reload, run };
    return <DisclosureContext.Provider value={value}>{children}</DisclosureContext.Provider>;
}
```

- [ ] **Step 2: Wire the provider and the sidebar**

`layout.tsx` — импорт `import DisclosureDataProvider from "./components/data/DisclosureDataProvider";` и обёртка внутри `AdminDataProvider`:

```tsx
            <AdminDataProvider>
                <DisclosureDataProvider>
                    <AdminUiProvider>
                        {/* …без изменений… */}
                    </AdminUiProvider>
                </DisclosureDataProvider>
            </AdminDataProvider>
```

`Sidebar.tsx`:

```tsx
import { FiChevronLeft, FiFileText, FiGrid, FiLogOut, FiPackage, FiUsers } from "react-icons/fi";
import { useDisclosureData } from "../data/DisclosureDataProvider";
// …
const ITEMS = [
    { href: "/admin", label: "Обзор", Icon: FiGrid },
    { href: "/admin/services", label: "Услуги", Icon: FiPackage },
    { href: "/admin/doctors", label: "Врачи", Icon: FiUsers },
    { href: "/admin/disclosure", label: "Раскрытие информации", Icon: FiFileText },
] as const;
// в теле компонента:
    const { data: disclosure } = useDisclosureData();
// в counts:
        "/admin/disclosure": disclosure ? disclosure.documents.length : null,
```

Проверить, что длинная подпись «Раскрытие информации» не ломает пункт: открыть `Sidebar.module.css`, у `.itemLabel` должно быть `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`; если нет — добавить.

- [ ] **Step 3: Write the page with tabs**

`disclosure/page.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDisclosureData } from "../components/data/DisclosureDataProvider";
import styles from "./disclosure.module.css";

const TABS = [
    { key: "documents", label: "Документы" },
    { key: "requisites", label: "Реквизиты" },
    { key: "dms", label: "ДМС" },
    { key: "regulators", label: "Контролирующие органы" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTab(value: string | null): value is TabKey {
    return TABS.some((t) => t.key === value);
}

function DisclosureScreen() {
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { data } = useDisclosureData();
    const raw = params.get("tab");
    const tab: TabKey = isTab(raw) ? raw : "documents";

    function select(next: TabKey) {
        const query = new URLSearchParams(params);
        query.set("tab", next);
        router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Раскрытие информации</h1>
            <div role="tablist" aria-label="Разделы раскрытия информации" className={styles.tabs}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        id={`tab-${t.key}`}
                        aria-selected={tab === t.key}
                        aria-controls={`panel-${t.key}`}
                        tabIndex={tab === t.key ? 0 : -1}
                        className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                        onClick={() => select(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === "documents" ? <p>Документов: {data?.documents.length ?? "…"}</p> : null}
                {tab === "requisites" ? <p>ИНН: {data?.requisites.inn || "не заполнен"}</p> : null}
                {tab === "dms" ? <p>Страховых компаний: {data?.dmsPartners.length ?? "…"}</p> : null}
                {tab === "regulators" ? <p>Органов: {data?.regulators.length ?? "…"}</p> : null}
            </div>
        </div>
    );
}

export default function DisclosurePage() {
    return (
        <Suspense>
            <DisclosureScreen />
        </Suspense>
    );
}
```

`disclosure.module.css` — `.page` и `.title` скопировать из `doctors/doctors.module.css`; вкладки:

```css
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.tab {
  padding: 8px 14px;
  border: 1px solid var(--glass-dark-border);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.tabActive {
  border-color: var(--brass-bright);
  color: var(--ink);
  font-weight: 600;
}

.tab:focus-visible { outline: 2px solid var(--brass-bright); outline-offset: 2px; }
```

- [ ] **Step 4: Typecheck, lint, build**

Run: `cd premium-website && npx tsc --noEmit -p . && npx eslint "app/(admin)" && npm run build`
Expected: без ошибок; в выводе сборки есть маршрут `/admin/disclosure`.

- [ ] **Step 5: Manual check** (`npm run dev`, бэкенд запущен, вход выполнен)

Открыть `/admin/disclosure`: пункт меню подсвечен, счётчик показывает `0`; клик по вкладке меняет `?tab=`, «назад» в браузере возвращает прежнюю вкладку; `/admin/disclosure?tab=мусор` открывает «Документы».

- [ ] **Step 6: Commit**

```bash
git add "premium-website/app/(admin)/admin/components/data/DisclosureDataProvider.tsx" "premium-website/app/(admin)/admin/disclosure/page.tsx" "premium-website/app/(admin)/admin/disclosure/disclosure.module.css" "premium-website/app/(admin)/admin/layout.tsx" "premium-website/app/(admin)/admin/components/shell/Sidebar.tsx" "premium-website/app/(admin)/admin/components/shell/Sidebar.module.css"
git commit -m "feat(admin): экран «Раскрытие информации» с вкладками и пункт меню"
```

---

### Task 9: Вкладка «Документы» — таблица и панель

**Files:**
- Create: `premium-website/app/(admin)/admin/components/DocumentTable.tsx`
- Create: `premium-website/app/(admin)/admin/components/DocumentSheet.tsx`
- Create: `premium-website/app/(admin)/admin/components/Disclosure.module.css`
- Modify: `premium-website/app/(admin)/admin/disclosure/page.tsx` (вкладка `documents`)

**Interfaces:**
- Consumes: `useDisclosureData` (задача 8); actions `actionCreateDocument`, `actionPatchDocument`, `actionDeleteDocument`, `actionReorderDocuments` (задача 6); `groupDocuments`, `guaranteeProgram`, `CATEGORY_LABELS`, `CLINIC_CATEGORIES`, `formatRuDate` (задача 5); `missingRequiredCategories`, `moveId` (задача 5); `validateDocument`, `DOCUMENT_FIELD_ORDER`, `firstErrorField` (задача 5, существующий); `FileDropzone` (задача 7); `Sheet`, `Modal`, `Input`, `Textarea`, `Button`, `EmptyState`, `Table*` (существующие); `loadDraft/saveDraft/clearDraft/isDirty` c scope `"document"`.
- Produces: `<DocumentTable onOpen(id) onCreate() />` и `<DocumentSheet open document onClose />` — оба сами берут данные и действия из `useDisclosureData`.

Порядок групп в таблице — `[...CLINIC_CATEGORIES.slice(0, 4), "GUARANTEE_PROGRAM", "OTHER"]`: как на сайте, программа госгарантий — перед «Прочими», потому что она обязательна.

- [ ] **Step 1: Write `DocumentTable.tsx`**

```tsx
"use client";

import { useState } from "react";
import { FiArrowDown, FiArrowUp, FiExternalLink, FiTrash2 } from "react-icons/fi";
import type { DisclosureDocument, DocumentCategory } from "@/lib/types";
import { CATEGORY_LABELS, formatRuDate } from "@/lib/disclosure";
import { missingRequiredCategories, moveId } from "@/lib/admin/disclosure";
import { actionDeleteDocument, actionReorderDocuments } from "../disclosure/actions";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import Modal from "./ui/Modal";
import { SkeletonRows } from "./ui/Skeleton";
import {
    StatusBadge,
    TableCell,
    TableColumnLabel,
    TableHead,
    TableRow,
    TableShell,
} from "./ui/Table";
import styles from "./Disclosure.module.css";

export const DOCUMENT_COLS = "minmax(240px, 2fr) 90px 110px 190px";

/** Порядок групп админки: как на сайте, госгарантии — перед «Прочими». */
export const ADMIN_CATEGORY_ORDER: DocumentCategory[] = [
    "CONTRACT",
    "PRICE_LIST",
    "LICENSE",
    "REGULATION",
    "GUARANTEE_PROGRAM",
    "OTHER",
];

export default function DocumentTable({
    onOpen,
    onCreate,
}: {
    onOpen: (id: number) => void;
    onCreate: () => void;
}) {
    const { data, loading, busy, reload, run } = useDisclosureData();
    const { setModalOpen } = useAdminUi();
    const [removing, setRemoving] = useState<DisclosureDocument | null>(null);

    const documents = data?.documents ?? [];
    const missing = new Set(missingRequiredCategories(documents));

    function move(category: DocumentCategory, id: number, delta: -1 | 1) {
        const ids = documents.filter((d) => d.category === category).map((d) => d.id);
        const next = moveId(ids, id, delta);
        if (next) void run(() => actionReorderDocuments(next), "Порядок сохранён");
    }

    function confirmRemove() {
        const target = removing;
        setRemoving(null);
        setModalOpen(false);
        if (target) void run(() => actionDeleteDocument(target.id), "Документ удалён");
    }

    return (
        <>
            <TableShell
                title={<span>Документы</span>}
                actions={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => void reload()} loading={loading} busyLabel="Обновляем…">
                            Обновить
                        </Button>
                        <Button variant="primary" size="sm" onClick={onCreate}>
                            Добавить документ
                        </Button>
                    </>
                }
            >
                <TableHead cols={DOCUMENT_COLS}>
                    <TableColumnLabel>Документ</TableColumnLabel>
                    <TableColumnLabel>Тип</TableColumnLabel>
                    <TableColumnLabel>Обновлён</TableColumnLabel>
                    <TableColumnLabel>Действия</TableColumnLabel>
                </TableHead>

                {loading && !data ? <SkeletonRows cols={DOCUMENT_COLS} /> : null}

                {data && documents.length === 0 ? (
                    <EmptyState
                        title="Документов пока нет"
                        description="Загрузите договор, прейскурант, лицензию и текст Постановления № 659 — без них раздел не соответствует требованиям."
                        action={<Button variant="primary" onClick={onCreate}>Добавить документ</Button>}
                    />
                ) : null}

                {data && documents.length > 0
                    ? ADMIN_CATEGORY_ORDER.map((category) => {
                          const rows = documents.filter((d) => d.category === category);
                          if (rows.length === 0 && !missing.has(category)) return null;
                          return (
                              <div key={category} role="rowgroup" aria-label={CATEGORY_LABELS[category]}>
                                  <div role="row" className={styles.groupHead}>
                                      <span role="columnheader">{CATEGORY_LABELS[category]}</span>
                                      {missing.has(category) ? (
                                          <StatusBadge badge={{ label: "Не хватает", tone: "danger" }} />
                                      ) : null}
                                  </div>
                                  {rows.map((doc, index) => (
                                      <TableRow key={doc.id} cols={DOCUMENT_COLS}>
                                          <TableCell>
                                              <button type="button" className={styles.docTitle} onClick={() => onOpen(doc.id)}>
                                                  {doc.title}
                                              </button>
                                              {doc.note ? <span className={styles.docNote}>{doc.note}</span> : null}
                                          </TableCell>
                                          <TableCell>{doc.kind === "FILE" ? "PDF" : "Ссылка"}</TableCell>
                                          <TableCell>{formatRuDate(doc.updatedAt)}</TableCell>
                                          <TableCell>
                                              <div className={styles.actions}>
                                                  <Button
                                                      variant="quiet"
                                                      size="icon"
                                                      disabled={busy || index === 0}
                                                      onClick={() => move(category, doc.id, -1)}
                                                      aria-label={`Поднять «${doc.title}»`}
                                                  >
                                                      <FiArrowUp aria-hidden="true" />
                                                  </Button>
                                                  <Button
                                                      variant="quiet"
                                                      size="icon"
                                                      disabled={busy || index === rows.length - 1}
                                                      onClick={() => move(category, doc.id, 1)}
                                                      aria-label={`Опустить «${doc.title}»`}
                                                  >
                                                      <FiArrowDown aria-hidden="true" />
                                                  </Button>
                                                  <a
                                                      href={doc.url}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className={styles.iconLink}
                                                      aria-label={`Открыть «${doc.title}» в новой вкладке`}
                                                  >
                                                      <FiExternalLink aria-hidden="true" />
                                                  </a>
                                                  <Button
                                                      variant="quiet"
                                                      size="icon"
                                                      disabled={busy}
                                                      onClick={() => {
                                                          setRemoving(doc);
                                                          setModalOpen(true);
                                                      }}
                                                      aria-label={`Удалить «${doc.title}»`}
                                                  >
                                                      <FiTrash2 aria-hidden="true" />
                                                  </Button>
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </div>
                          );
                      })
                    : null}
            </TableShell>

            <Modal
                open={removing !== null}
                title="Удалить документ?"
                description={`«${removing?.title ?? ""}» пропадёт со страницы раскрытия информации. Файл останется на сервере, но ссылки на него больше не будет.`}
                cancelLabel="Оставить"
                confirmLabel="Удалить"
                onCancel={() => {
                    setRemoving(null);
                    setModalOpen(false);
                }}
                onConfirm={confirmRemove}
            />
        </>
    );
}
```

- [ ] **Step 2: Write `DocumentSheet.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DisclosureDocument, DisclosureDocumentPayload, DocumentKind } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/disclosure";
import { clearDraft, isDirty, loadDraft, saveDraft } from "@/lib/admin/draft";
import {
    DOCUMENT_FIELD_ORDER,
    DOCUMENT_NOTE_MAX,
    type DocumentField,
    type FieldErrors,
    firstErrorField,
    validateDocument,
} from "@/lib/admin/validation";
import { actionCreateDocument, actionPatchDocument } from "../disclosure/actions";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import { ADMIN_CATEGORY_ORDER } from "./DocumentTable";
import Button from "./ui/Button";
import FileDropzone from "./ui/FileDropzone";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import Sheet from "./ui/Sheet";
import Textarea from "./ui/Textarea";
import { useToast } from "./ui/ToastProvider";
import styles from "./Disclosure.module.css";
import sheetStyles from "./ServiceSheet.module.css";

const EMPTY: DisclosureDocumentPayload = { title: "", category: "CONTRACT", kind: "FILE", url: "", note: "" };

function toPayload(doc: DisclosureDocument): DisclosureDocumentPayload {
    return { title: doc.title, category: doc.category, kind: doc.kind, url: doc.url, note: doc.note };
}

/** Какое поле подсветить по тексту ошибки бэкенда; остальное — в тост. */
function fieldOfBackendError(message: string): DocumentField | null {
    if (message.includes("название")) return "title";
    if (message.includes("Примечание")) return "note";
    if (message.includes("https://") || message.includes("PDF") || message.includes("Файл")) return "url";
    return null;
}

export default function DocumentSheet({
    open,
    document,
    onClose,
}: {
    open: boolean;
    document: DisclosureDocument | null;
    onClose: () => void;
}) {
    const { push } = useToast();
    const { run, busy } = useDisclosureData();
    const { setFormSubmit, modalOpen, setModalOpen } = useAdminUi();
    const draftId = document ? document.id : "new";
    const initial = useMemo(() => (document ? toPayload(document) : EMPTY), [document]);

    const [form, setForm] = useState<DisclosureDocumentPayload>(initial);
    const [errors, setErrors] = useState<FieldErrors<DocumentField>>({});
    const [confirmClose, setConfirmClose] = useState(false);

    useEffect(() => {
        if (!open) return;
        setForm(loadDraft<DisclosureDocumentPayload>("document", draftId) ?? initial);
        setErrors({});
    }, [open, draftId, initial]);

    const dirty = isDirty(form, initial);

    useEffect(() => {
        if (open && dirty) saveDraft("document", draftId, form);
    }, [open, dirty, form, draftId]);

    useEffect(() => {
        if (!open || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [open, dirty]);

    async function submit() {
        const found = validateDocument(form);
        setErrors(found);
        const first = firstErrorField(found, DOCUMENT_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте форму" });
            window.document.getElementById(`document-${first}`)?.focus();
            return;
        }
        const result = await run(
            () => (document ? actionPatchDocument(document.id, form) : actionCreateDocument(form)),
            document ? "Документ сохранён" : "Документ добавлен",
        );
        if (!result.ok) {
            const field = fieldOfBackendError(result.error);
            if (field) setErrors({ [field]: result.error });
            return;
        }
        clearDraft("document", draftId);
        onClose();
    }

    useEffect(() => {
        if (!open) return;
        setFormSubmit(() => void submit());
        return () => setFormSubmit(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, form]);

    const modalWasOpen = useRef(false);
    useEffect(() => {
        if (modalWasOpen.current && !modalOpen) setConfirmClose(false);
        modalWasOpen.current = modalOpen;
    }, [modalOpen]);

    function requestClose() {
        if (dirty) {
            setConfirmClose(true);
            setModalOpen(true);
            return;
        }
        onClose();
    }

    function discard() {
        clearDraft("document", draftId);
        setConfirmClose(false);
        setModalOpen(false);
        onClose();
    }

    function setKind(kind: DocumentKind) {
        // Смена типа обнуляет адрес: путь к файлу не годится как ссылка и наоборот.
        setForm((f) => (f.kind === kind ? f : { ...f, kind, url: "" }));
    }

    return (
        <>
            <Sheet
                open={open}
                title={document ? `Документ: ${document.title}` : "Новый документ"}
                onClose={requestClose}
                footer={
                    <>
                        <span className={sheetStyles.draftHint}>
                            {dirty ? "Черновик сохраняется автоматически" : "Изменений нет"}
                        </span>
                        <Button variant="ghost" onClick={requestClose}>Отменить</Button>
                        <Button variant="primary" onClick={() => void submit()} loading={busy} busyLabel="Сохраняем…">
                            Сохранить <kbd className={sheetStyles.kbd}>⌘S</kbd>
                        </Button>
                    </>
                }
            >
                <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="document-category">Категория</label>
                    <select
                        id="document-category"
                        className={styles.select}
                        value={form.category}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, category: e.target.value as DisclosureDocumentPayload["category"] }))
                        }
                    >
                        {ADMIN_CATEGORY_ORDER.map((c) => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                    </select>
                </div>

                <Input
                    id="document-title"
                    label="Название"
                    required
                    value={form.title}
                    error={errors.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />

                <fieldset className={styles.kind}>
                    <legend className={styles.fieldLabel}>Тип</legend>
                    <label>
                        <input type="radio" name="document-kind" checked={form.kind === "FILE"} onChange={() => setKind("FILE")} />
                        Файл PDF
                    </label>
                    <label>
                        <input type="radio" name="document-kind" checked={form.kind === "LINK"} onChange={() => setKind("LINK")} />
                        Ссылка на внешний сайт
                    </label>
                </fieldset>

                {form.kind === "FILE" ? (
                    <FileDropzone
                        id="document-url"
                        label="Файл"
                        value={form.url}
                        error={errors.url}
                        onUploaded={(url, fileName) =>
                            setForm((f) => ({
                                ...f,
                                url,
                                // Пустое название подсказываем именем файла — редактор поправит.
                                title: f.title.trim() ? f.title : fileName.replace(/\.pdf$/i, ""),
                            }))
                        }
                        onError={(title) => push({ tone: "error", title })}
                    />
                ) : (
                    <Input
                        id="document-url"
                        label="Ссылка"
                        required
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        value={form.url}
                        error={errors.url}
                        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    />
                )}

                <Textarea
                    id="document-note"
                    label="Примечание"
                    max={DOCUMENT_NOTE_MAX}
                    value={form.note}
                    error={errors.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
            </Sheet>

            <Modal
                open={confirmClose}
                title="Закрыть без сохранения?"
                description="Введённое останется в черновике и восстановится, когда вы вернётесь к этой записи."
                cancelLabel="Продолжить правку"
                confirmLabel="Закрыть"
                onCancel={() => {
                    setConfirmClose(false);
                    setModalOpen(false);
                }}
                onConfirm={discard}
            />
        </>
    );
}
```

- [ ] **Step 3: Write `Disclosure.module.css`** (токены — из `DoctorTable.module.css` и `Input.module.css`)

```css
.groupHead {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.docTitle {
  display: block;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docNote {
  display: block;
  font-size: 12px;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions { display: flex; align-items: center; gap: 2px; }

.iconLink {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--ink-soft);
}

.field { display: grid; gap: 6px; }

.fieldLabel { font-size: 12px; font-weight: 600; color: var(--ink-soft); }

.select {
  padding: 10px 12px;
  border: 1px solid var(--glass-dark-border);
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--ink);
  font: inherit;
}

.kind {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 14px;
}

.kind label { display: flex; align-items: center; gap: 8px; }
```

- [ ] **Step 4: Put the tab into the page**

В `disclosure/page.tsx`: импорты `useEffect, useRef, useState`, `DocumentTable`, `DocumentSheet`, `useAdminUi`; внутри `DisclosureScreen` — состояние панели ровно как в `doctors/page.tsx` (`SheetState`, синхронизация с `sheetOpen`, закрытие по Esc через переход `true → false`):

```tsx
type SheetState = { mode: "create" } | { mode: "edit"; id: number } | null;
// …в DisclosureScreen:
    const { sheetOpen, setSheetOpen } = useAdminUi();
    const [sheet, setSheet] = useState<SheetState>(null);

    useEffect(() => {
        setSheetOpen(sheet !== null);
    }, [sheet, setSheetOpen]);

    const wasOpen = useRef(false);
    useEffect(() => {
        if (wasOpen.current && !sheetOpen) setSheet(null);
        wasOpen.current = sheetOpen;
    }, [sheetOpen]);

    const editing =
        sheet?.mode === "edit" ? data?.documents.find((d) => d.id === sheet.id) ?? null : null;
```

и заменить абзац вкладки документов:

```tsx
                {tab === "documents" ? (
                    <>
                        <DocumentTable
                            onOpen={(id) => setSheet({ mode: "edit", id })}
                            onCreate={() => setSheet({ mode: "create" })}
                        />
                        <DocumentSheet open={sheet !== null} document={editing} onClose={() => setSheet(null)} />
                    </>
                ) : null}
```

- [ ] **Step 5: Typecheck, lint, build**

Run: `cd premium-website && npx tsc --noEmit -p . && npx eslint "app/(admin)" && npm run build`
Expected: без ошибок.

- [ ] **Step 6: Manual check** (бэкенд и `npm run dev`)

1. Пустой раздел: пустое состояние; после первого документа — у пяти обязательных групп бейдж «Не хватает», кроме заполненной.
2. «Добавить документ» → «Прейскурант» → перетащить PDF: имя и размер файла, название подставилось из имени; «Сохранить» → тост, строка в группе «Прейскурант».
3. Перетащить `.jpg` → тост «Подойдёт только PDF»; переименованный в `.pdf` HTML → тост «Файл не PDF» (ответ бэкенда).
4. Тип «Ссылка», `http://…` → ошибка у поля; `https://health.bashkortostan.ru` в категории «Программа госгарантий» → сохраняется.
5. Два документа в одной группе: ↑/↓ меняет порядок, крайние кнопки неактивны; после перезагрузки порядок тот же.
6. Во второй вкладке браузера удалить документ, в первой нажать ↓ у соседнего → тост «Список устарел — обновите страницу», таблица перечиталась.
7. Открыть документ, заменить файл → запись и позиция те же, «Обновлён» — сегодня.
8. Закрыть панель с несохранёнными правками → модалка; черновик восстанавливается.
9. Удаление → модалка → строка пропала.

- [ ] **Step 7: Commit**

```bash
git add "premium-website/app/(admin)/admin/components/DocumentTable.tsx" "premium-website/app/(admin)/admin/components/DocumentSheet.tsx" "premium-website/app/(admin)/admin/components/Disclosure.module.css" "premium-website/app/(admin)/admin/disclosure/page.tsx"
git commit -m "feat(admin): вкладка «Документы» — загрузка, замена, порядок, удаление"
```

---

### Task 10: Вкладка «Реквизиты»

**Files:**
- Create: `premium-website/app/(admin)/admin/components/RequisitesForm.tsx`
- Modify: `premium-website/app/(admin)/admin/disclosure/page.tsx` (вкладка `requisites`)
- Modify: `premium-website/app/(admin)/admin/components/Disclosure.module.css` (стиль формы)

**Interfaces:**
- Consumes: `useDisclosureData`, `actionPatchRequisites`, `validateRequisites`, `REQUISITES_FIELD_ORDER`, `firstErrorField`, `Input`, `Button`, `useToast`.
- Produces: `<RequisitesForm />` без пропсов.

- [ ] **Step 1: Write the form**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { ClinicRequisites } from "@/lib/types";
import { isDirty } from "@/lib/admin/draft";
import {
    type FieldErrors,
    REQUISITES_FIELD_ORDER,
    type RequisitesField,
    firstErrorField,
    validateRequisites,
} from "@/lib/admin/validation";
import { actionPatchRequisites } from "../disclosure/actions";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { useToast } from "./ui/ToastProvider";
import styles from "./Disclosure.module.css";

const FIELDS: { key: RequisitesField; label: string; hint?: string; inputMode?: "numeric" }[] = [
    { key: "legalName", label: "Полное наименование", hint: "Как в ЕГРЮЛ, дословно" },
    { key: "shortName", label: "Сокращённое наименование", hint: "Подставляется в надпись про ОМС" },
    { key: "inn", label: "ИНН", inputMode: "numeric" },
    { key: "kpp", label: "КПП", inputMode: "numeric" },
    { key: "ogrn", label: "ОГРН", inputMode: "numeric" },
    { key: "registeredAt", label: "Дата регистрации" },
    { key: "legalAddress", label: "Юридический адрес" },
    { key: "actualAddress", label: "Фактический адрес" },
];

const EMPTY: ClinicRequisites = {
    legalName: "",
    shortName: "",
    inn: "",
    kpp: "",
    ogrn: "",
    registeredAt: "",
    legalAddress: "",
    actualAddress: "",
};

/** Поле, к которому относится ошибка бэкенда: у кодов она начинается с их названия. */
function fieldOfBackendError(message: string): RequisitesField | null {
    if (message.startsWith("ИНН")) return "inn";
    if (message.startsWith("КПП")) return "kpp";
    if (message.startsWith("ОГРН")) return "ogrn";
    if (message.includes("дата")) return "registeredAt";
    return null;
}

export default function RequisitesForm() {
    const { push } = useToast();
    const { data, run, busy } = useDisclosureData();
    const saved = data?.requisites ?? EMPTY;
    const [form, setForm] = useState<ClinicRequisites>(saved);
    const [errors, setErrors] = useState<FieldErrors<RequisitesField>>({});

    // Сервер — источник правды: после сохранения и перечитывания форма
    // показывает то, что записалось (обрезанные пробелы, очищенные поля).
    useEffect(() => {
        setForm(saved);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.requisites]);

    const dirty = isDirty(form, saved);

    async function submit() {
        const found = validateRequisites(form);
        setErrors(found);
        const first = firstErrorField(found, REQUISITES_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте реквизиты" });
            document.getElementById(`requisites-${first}`)?.focus();
            return;
        }
        const result = await run(() => actionPatchRequisites(form), "Реквизиты сохранены");
        if (!result.ok) {
            const field = fieldOfBackendError(result.error);
            if (field) setErrors({ [field]: result.error });
        }
    }

    return (
        <form
            className={styles.form}
            onSubmit={(e) => {
                e.preventDefault();
                void submit();
            }}
        >
            {FIELDS.map(({ key, label, hint, inputMode }) => (
                <Input
                    key={key}
                    id={`requisites-${key}`}
                    label={label}
                    hint={key === "registeredAt" ? "ГГГГ-ММ-ДД, например 2022-09-06" : hint}
                    inputMode={inputMode}
                    value={form[key]}
                    error={errors[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
            ))}
            <div className={styles.formActions}>
                <Button variant="ghost" disabled={!dirty || busy} onClick={() => setForm(saved)}>
                    Отменить изменения
                </Button>
                <Button type="submit" variant="primary" disabled={!dirty} loading={busy} busyLabel="Сохраняем…">
                    Сохранить
                </Button>
            </div>
        </form>
    );
}
```

В `Disclosure.module.css`:

```css
.form { display: grid; gap: 14px; max-width: 640px; }

.formActions { display: flex; justify-content: flex-end; gap: 8px; }
```

- [ ] **Step 2: Put the tab into the page**

В `disclosure/page.tsx` — `import RequisitesForm from "../components/RequisitesForm";` и:

```tsx
                {tab === "requisites" ? <RequisitesForm /> : null}
```

- [ ] **Step 3: Typecheck, lint**

Run: `cd premium-website && npx tsc --noEmit -p . && npx eslint "app/(admin)"`
Expected: без ошибок.

- [ ] **Step 4: Manual check**

1. Ввести реквизиты из `premium-website/lib/disclosure.ts` (`REQUISITES`), дату — `2022-09-06` → «Сохранить» → тост; перезагрузка страницы — значения на месте.
2. ИНН `0276 970983` → ошибка у поля ИНН до запроса; ` 0276970983 ` → сохраняется, после сохранения пробелов нет.
3. Очистить КПП → сохраняется пустым.

- [ ] **Step 5: Commit**

```bash
git add "premium-website/app/(admin)/admin/components/RequisitesForm.tsx" "premium-website/app/(admin)/admin/components/Disclosure.module.css" "premium-website/app/(admin)/admin/disclosure/page.tsx"
git commit -m "feat(admin): вкладка «Реквизиты» раздела раскрытия"
```

---

### Task 11: Вкладки «ДМС» и «Контролирующие органы»

**Files:**
- Create: `premium-website/app/(admin)/admin/components/OrderedListTable.tsx`
- Modify: `premium-website/app/(admin)/admin/disclosure/page.tsx` (вкладки `dms`, `regulators`)
- Modify: `premium-website/app/(admin)/admin/components/Disclosure.module.css`

**Interfaces:**
- Consumes: `useDisclosureData`; actions партнёров и органов (задача 6); `validateDmsPartner`, `validateRegulator`, `moveId`; `InlineEdit`, `Input`, `Button`, `Modal`, `EmptyState`, `Table*`.
- Produces: обобщённый `<OrderedListTable<T extends { id: number }>>` с пропсами:
  ```ts
  {
      title: string;
      rows: T[];
      columns: { key: keyof T & string; label: string; placeholder: string; width: string }[];
      emptyTitle: string;
      emptyDescription: string;
      validate: (draft: Record<string, string>) => Partial<Record<string, string>>;
      onCreate: (draft: Record<string, string>) => Promise<{ ok: boolean }>;
      onPatch: (id: number, key: string, value: string) => void;
      onDelete: (id: number) => void;
      onReorder: (ids: number[]) => void;
      itemName: (row: T) => string;
  }
  ```

Одна таблица на две вкладки: у партнёров и органов одинаковое поведение (добавить строкой, поправить на месте, сдвинуть, удалить), различаются только колонки.

- [ ] **Step 1: Write `OrderedListTable.tsx`**

```tsx
"use client";

import { type CSSProperties, useState } from "react";
import { FiArrowDown, FiArrowUp, FiTrash2 } from "react-icons/fi";
import { moveId } from "@/lib/admin/disclosure";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import InlineEdit from "./ui/InlineEdit";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import { TableCell, TableColumnLabel, TableHead, TableRow, TableShell } from "./ui/Table";
import styles from "./Disclosure.module.css";

export type ListColumn<T> = { key: keyof T & string; label: string; placeholder: string; width: string };

export default function OrderedListTable<T extends { id: number }>({
    title,
    rows,
    columns,
    emptyTitle,
    emptyDescription,
    validate,
    onCreate,
    onPatch,
    onDelete,
    onReorder,
    itemName,
}: {
    title: string;
    rows: T[];
    columns: ListColumn<T>[];
    emptyTitle: string;
    emptyDescription: string;
    validate: (draft: Record<string, string>) => Partial<Record<string, string>>;
    onCreate: (draft: Record<string, string>) => Promise<{ ok: boolean }>;
    onPatch: (id: number, key: string, value: string) => void;
    onDelete: (id: number) => void;
    onReorder: (ids: number[]) => void;
    itemName: (row: T) => string;
}) {
    const { busy } = useDisclosureData();
    const { setModalOpen } = useAdminUi();
    const blank = Object.fromEntries(columns.map((c) => [c.key, ""]));
    const [draft, setDraft] = useState<Record<string, string>>(blank);
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const [removing, setRemoving] = useState<T | null>(null);

    const cols = `${columns.map((c) => c.width).join(" ")} 130px`;
    const ids = rows.map((r) => r.id);

    async function add() {
        const found = validate(draft);
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        const result = await onCreate(draft);
        if (result.ok) setDraft(blank);
    }

    function move(id: number, delta: -1 | 1) {
        const next = moveId(ids, id, delta);
        if (next) onReorder(next);
    }

    return (
        <>
            <TableShell title={<span>{title}</span>}>
                <TableHead cols={cols}>
                    {columns.map((c) => (
                        <TableColumnLabel key={c.key}>{c.label}</TableColumnLabel>
                    ))}
                    <TableColumnLabel>Действия</TableColumnLabel>
                </TableHead>

                {rows.length === 0 ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}

                {rows.map((row, index) => (
                    <TableRow key={row.id} cols={cols}>
                        {columns.map((c) => {
                            const value = String(row[c.key] ?? "");
                            return (
                                <TableCell key={c.key}>
                                    <InlineEdit
                                        value={value}
                                        label={`${c.label}: «${itemName(row)}»`}
                                        onCommit={(next) => onPatch(row.id, c.key, next)}
                                    >
                                        <span className={value ? styles.cellValue : styles.cellEmpty}>
                                            {value || c.placeholder}
                                        </span>
                                    </InlineEdit>
                                </TableCell>
                            );
                        })}
                        <TableCell>
                            <div className={styles.actions}>
                                <Button variant="quiet" size="icon" disabled={busy || index === 0} onClick={() => move(row.id, -1)} aria-label={`Поднять «${itemName(row)}»`}>
                                    <FiArrowUp aria-hidden="true" />
                                </Button>
                                <Button variant="quiet" size="icon" disabled={busy || index === rows.length - 1} onClick={() => move(row.id, 1)} aria-label={`Опустить «${itemName(row)}»`}>
                                    <FiArrowDown aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="quiet"
                                    size="icon"
                                    disabled={busy}
                                    onClick={() => {
                                        setRemoving(row);
                                        setModalOpen(true);
                                    }}
                                    aria-label={`Удалить «${itemName(row)}»`}
                                >
                                    <FiTrash2 aria-hidden="true" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}

                <form
                    className={styles.addRow}
                    style={{ "--cols": cols } as CSSProperties}
                    onSubmit={(e) => {
                        e.preventDefault();
                        void add();
                    }}
                >
                    {columns.map((c) => (
                        <Input
                            key={c.key}
                            id={`add-${title}-${c.key}`}
                            label={c.label}
                            placeholder={c.placeholder}
                            value={draft[c.key]}
                            error={errors[c.key]}
                            onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
                        />
                    ))}
                    <Button type="submit" variant="primary" size="sm" loading={busy} busyLabel="Добавляем…">
                        Добавить
                    </Button>
                </form>
            </TableShell>

            <Modal
                open={removing !== null}
                title="Удалить запись?"
                description={`«${removing ? itemName(removing) : ""}» пропадёт со страницы раскрытия информации.`}
                cancelLabel="Оставить"
                confirmLabel="Удалить"
                onCancel={() => {
                    setRemoving(null);
                    setModalOpen(false);
                }}
                onConfirm={() => {
                    if (removing) onDelete(removing.id);
                    setRemoving(null);
                    setModalOpen(false);
                }}
            />
        </>
    );
}
```

В `Disclosure.module.css`:

```css
.cellValue { font-size: 14px; color: var(--ink); overflow-wrap: anywhere; }

.cellEmpty { font-size: 13px; color: var(--ink-soft); font-style: italic; }

/* Строка добавления стоит в той же сетке, что строки таблицы. */
.addRow {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: end;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid var(--glass-dark-border);
}

@media (max-width: 820px) {
  .addRow { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Put both tabs into the page**

В `disclosure/page.tsx` — импорты `OrderedListTable`, `validateDmsPartner`, `validateRegulator` и шести actions партнёров и органов; в `DisclosureScreen` взять `run` из `useDisclosureData()`:

```tsx
                {tab === "dms" ? (
                    <OrderedListTable
                        title="Страховые компании-партнёры по ДМС"
                        rows={data?.dmsPartners ?? []}
                        columns={[
                            { key: "name", label: "Название", placeholder: "Название компании", width: "minmax(200px, 2fr)" },
                            { key: "site", label: "Сайт", placeholder: "https://", width: "minmax(180px, 1.5fr)" },
                        ]}
                        emptyTitle="Партнёров по ДМС пока нет"
                        emptyDescription="Пока список пуст, сайт предлагает уточнить партнёров по телефону клиники."
                        validate={(d) => validateDmsPartner({ name: d.name, site: d.site })}
                        onCreate={(d) => run(() => actionCreateDmsPartner({ name: d.name, site: d.site }), "Компания добавлена")}
                        onPatch={(id, key, value) => void run(() => actionPatchDmsPartner(id, { [key]: value }), "Сохранено")}
                        onDelete={(id) => void run(() => actionDeleteDmsPartner(id), "Компания удалена")}
                        onReorder={(ids) => void run(() => actionReorderDmsPartners(ids), "Порядок сохранён")}
                        itemName={(row) => row.name}
                    />
                ) : null}
                {tab === "regulators" ? (
                    <OrderedListTable
                        title="Контролирующие органы"
                        rows={data?.regulators ?? []}
                        columns={[
                            { key: "name", label: "Название", placeholder: "Название органа", width: "minmax(200px, 2fr)" },
                            { key: "address", label: "Адрес", placeholder: "Адрес", width: "minmax(180px, 1.5fr)" },
                            { key: "phone", label: "Телефон", placeholder: "+7 …", width: "140px" },
                            { key: "site", label: "Сайт", placeholder: "https://", width: "minmax(160px, 1fr)" },
                        ]}
                        emptyTitle="Органы не добавлены"
                        emptyDescription="Постановление требует адреса, телефоны и сайты Минздрава РБ, Роспотребнадзора и Росздравнадзора."
                        validate={(d) =>
                            validateRegulator({ name: d.name, address: d.address, phone: d.phone, site: d.site })
                        }
                        onCreate={(d) =>
                            run(
                                () => actionCreateRegulator({ name: d.name, address: d.address, phone: d.phone, site: d.site }),
                                "Орган добавлен",
                            )
                        }
                        onPatch={(id, key, value) => void run(() => actionPatchRegulator(id, { [key]: value }), "Сохранено")}
                        onDelete={(id) => void run(() => actionDeleteRegulator(id), "Орган удалён")}
                        onReorder={(ids) => void run(() => actionReorderRegulators(ids), "Порядок сохранён")}
                        itemName={(row) => row.name}
                    />
                ) : null}
```

- [ ] **Step 3: Typecheck, lint, build**

Run: `cd premium-website && npx tsc --noEmit -p . && npx eslint "app/(admin)" && npm run build`
Expected: без ошибок.

- [ ] **Step 4: Manual check**

1. Добавить три органа из `lib/disclosure.ts` (`REGULATORS`) с сайтами; адрес и телефон — если клиника прислала, иначе пусто.
2. Сайт `02.rospotrebnadzor.ru` без схемы → ошибка у поля; инлайн-правка сайта на `http://…` → тост с ошибкой бэкенда, значение не изменилось.
3. ↑/↓, удаление с подтверждением — как у документов.
4. Ширина 375 px: строка добавления складывается в колонку, горизонтальной прокрутки страницы нет.

- [ ] **Step 5: Commit**

```bash
git add "premium-website/app/(admin)/admin/components/OrderedListTable.tsx" "premium-website/app/(admin)/admin/components/Disclosure.module.css" "premium-website/app/(admin)/admin/disclosure/page.tsx"
git commit -m "feat(admin): вкладки «ДМС» и «Контролирующие органы»"
```

**Граница релиза 1.** После задачи 11 — полный прогон `./mvnw -q test`, `npx vitest run`, `npm run build`, деплой бэкенда и админки. Администратор заносит реальные данные (спека, раздел 5). Задачу 12 начинать только после того, как `GET /api/cms/disclosure` на проде отдаёт заполненный раздел.

---

### Task 12: Витрина читает раздел с бэкенда (релиз 2)

**Files:**
- Modify: `premium-website/lib/cms.ts` (добавить `getDisclosure`, `normalizeDisclosure`)
- Test: `premium-website/lib/cms.test.ts` (новый)
- Modify: `premium-website/app/(site)/documents/page.tsx`
- Create: `premium-website/app/(site)/documents/error.tsx`
- Modify: `premium-website/lib/disclosure.ts` (удалить данные)
- Modify: `premium-website/lib/disclosure.test.ts` (удалить тесты данных)
- Modify: `premium-website/next.config.ts` (редиректы)
- Delete: `premium-website/public/docs/contract.pdf`, `price.pdf`, `reestr.pdf`, `nalog.pdf`, `pp-659.pdf`

**Interfaces:**
- Consumes: `GET /api/cms/disclosure` (задача 4); `DISCLOSURE_TAG`, `groupDocuments`, `guaranteeProgram`, `formatRuDate`, `omsNotice` (задача 5 и существующая).
- Produces: `getDisclosure(): Promise<Disclosure>` — бросает при недоступном бэкенде, не-2xx и неверной форме ответа; `normalizeDisclosure(raw: unknown): Disclosure` — бросает на неверной форме.

- [ ] **Step 1: Write the failing test**

`lib/cms.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VALID = {
    requisites: {
        legalName: "Общество",
        shortName: "ООО «ПРЕМИУМ»",
        inn: "0276970983",
        kpp: "",
        ogrn: "",
        registeredAt: "",
        legalAddress: "",
        actualAddress: "",
    },
    documents: [],
    dmsPartners: [],
    regulators: [],
};

describe("getDisclosure", () => {
    beforeEach(() => {
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("запрашивает раздел с тегом кеша и возвращает данные", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(VALID), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const { getDisclosure } = await import("./cms");

        await expect(getDisclosure()).resolves.toEqual(VALID);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("http://backend.test/api/cms/disclosure");
        expect(init.next).toEqual({ tags: ["disclosure"], revalidate: 3600 });
    });

    it("бросает, а не отдаёт пустой раздел, если бэкенд недоступен", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
        const { getDisclosure } = await import("./cms");
        await expect(getDisclosure()).rejects.toThrow();
    });

    it("бросает на ответ не-2xx", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 502 })));
        const { getDisclosure } = await import("./cms");
        await expect(getDisclosure()).rejects.toThrow("502");
    });

    it("бросает на ответ неверной формы", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: "x" }), { status: 200 })));
        const { getDisclosure } = await import("./cms");
        await expect(getDisclosure()).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd premium-website && npx vitest run lib/cms.test.ts`
Expected: FAIL — `getDisclosure is not a function`.

- [ ] **Step 3: Implement `getDisclosure`**

В `lib/cms.ts` — к импорту типов добавить `Disclosure`, импорт `import { DISCLOSURE_TAG } from "./disclosure";`, в конец файла:

```ts
/**
 * Проверка формы ответа: витрина печатает раздел по постановлению, и
 * «пустой, потому что пришло не то» опаснее явной ошибки.
 */
export function normalizeDisclosure(raw: unknown): Disclosure {
    const value = raw as Partial<Disclosure> | null;
    if (
        !value ||
        typeof value.requisites !== "object" ||
        value.requisites === null ||
        !Array.isArray(value.documents) ||
        !Array.isArray(value.dmsPartners) ||
        !Array.isArray(value.regulators)
    ) {
        throw new Error("CMS: /api/cms/disclosure вернул данные неверной формы");
    }
    return value as Disclosure;
}

/**
 * В отличие от fetchCms, бросает. Пустой раздел раскрытия, закешированный на
 * час, — это нарушение постановления, а не деградация. Если сбой случится при
 * фоновой ревалидации, Next продолжит отдавать прошлые данные; если данных
 * ещё не было — страница покажет error.tsx.
 */
export async function getDisclosure(): Promise<Disclosure> {
    if (!BACKEND_URL) throw new Error("CMS: переменная BACKEND_URL не задана");
    const response = await fetch(`${BACKEND_URL}/api/cms/disclosure`, {
        headers: { accept: "application/json" },
        next: { tags: [DISCLOSURE_TAG], revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) throw new Error(`CMS: GET /api/cms/disclosure → ${response.status}`);
    return normalizeDisclosure(await response.json());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd premium-website && npx vitest run lib/cms.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Switch the page to backend data**

`app/(site)/documents/page.tsx` — полностью:

```tsx
import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";
import { getDisclosure } from "@/lib/cms";
import { formatRuDate, groupDocuments, guaranteeProgram, omsNotice } from "@/lib/disclosure";
import type { DisclosureDocument } from "@/lib/types";
import styles from "./page.module.css";

export const metadata: Metadata = {
    title: "Раскрытие информации",
    description:
        "Реквизиты, лицензия, прейскурант, образец договора, сведения об ОМС и ДМС и контакты контролирующих органов клиники «Премиум» в Уфе.",
};

/**
 * Рендер на запрос, данные — из кеша с тегом (lib/cms.ts). Так страница не
 * ходит на бэкенд при сборке образа, а правка в админке видна при следующем
 * заходе: admin actions сбрасывают тег. revalidate = 0 не трогает fetch с
 * явным положительным revalidate — он остаётся в data cache.
 */
export const revalidate = 0;

/** Строка реквизита печатается, только если значение заполнено. */
function Requisite({ label, value }: { label: string; value: string }) {
    if (!value.trim()) return null;
    return (
        <div className={styles.requisite}>
            <dt className={styles.requisiteLabel}>{label}</dt>
            <dd className={styles.requisiteValue}>{value}</dd>
        </div>
    );
}

function DocumentLink({ doc }: { doc: DisclosureDocument }) {
    const kind = doc.kind === "FILE" ? "PDF" : "Внешний сайт";
    const updated = formatRuDate(doc.updatedAt);
    return (
        <li className="link-item">
            <div className={styles.docTitle}>
                <a href={doc.url} target="_blank" rel="noreferrer">
                    {doc.title} ({kind})
                </a>
                {doc.note ? <div className={styles.note}>{doc.note}</div> : null}
                {updated ? <div className={styles.note}>Обновлено {updated}</div> : null}
            </div>
            <span aria-hidden="true">{kind}</span>
        </li>
    );
}

export default async function DisclosurePage() {
    const { requisites, documents, dmsPartners, regulators } = await getDisclosure();
    const groups = groupDocuments(documents);
    const program = guaranteeProgram(documents);

    return (
        <div className="page">
            <h1>Раскрытие информации</h1>
            <p className={styles.lead}>
                Сведения, которые медицинская организация обязана публиковать в
                соответствии с Постановлением Правительства РФ № 659.
            </p>

            <nav className={styles.toc} aria-label="Разделы страницы">
                <a href="#requisites">Реквизиты</a>
                <a href="#docs">Документы</a>
                <a href="#oms">ОМС и ДМС</a>
                <a href="#regulators">Контролирующие органы</a>
            </nav>

            <section id="requisites" className={styles.section}>
                <h2>Реквизиты организации</h2>
                <dl className={styles.requisites}>
                    <Requisite label="Полное наименование" value={requisites.legalName} />
                    <Requisite label="Сокращённое наименование" value={requisites.shortName} />
                    <Requisite label="ИНН" value={requisites.inn} />
                    <Requisite label="КПП" value={requisites.kpp} />
                    <Requisite label="ОГРН" value={requisites.ogrn} />
                    <Requisite label="Дата регистрации" value={formatRuDate(requisites.registeredAt)} />
                    <Requisite label="Юридический адрес" value={requisites.legalAddress} />
                    <Requisite label="Фактический адрес" value={requisites.actualAddress} />
                    <Requisite label="Телефон" value={CLINIC.phone} />
                    <Requisite label="Электронная почта" value={CLINIC.email} />
                    <Requisite label="Режим работы" value={`${CLINIC.hoursWeekdays}; ${CLINIC.hoursWeekend}`} />
                </dl>
            </section>

            <section id="docs" className={styles.section}>
                <h2>Документы</h2>
                <p>Файлы открываются в новой вкладке.</p>
                {groups.map((group) => (
                    <div key={group.category}>
                        {groups.length > 1 ? <h3>{group.label}</h3> : null}
                        <ul className="link-list">
                            {group.documents.map((doc) => (
                                <DocumentLink key={doc.id} doc={doc} />
                            ))}
                        </ul>
                    </div>
                ))}
            </section>

            <section id="oms" className={styles.section}>
                <h2>Обязательное и добровольное медицинское страхование</h2>

                <p className={styles.omsNotice}>{omsNotice(requisites.shortName)}</p>

                {program ? (
                    <p>
                        <a href={program.url} target="_blank" rel="noreferrer">
                            {program.title}
                        </a>
                    </p>
                ) : null}

                <h3>Страховые компании-партнёры по ДМС</h3>
                {dmsPartners.length > 0 ? (
                    <ul className={styles.partners}>
                        {dmsPartners.map((partner) => (
                            <li key={partner.id}>
                                {partner.site ? (
                                    <a href={partner.site} target="_blank" rel="noreferrer">{partner.name}</a>
                                ) : (
                                    partner.name
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>
                        Список партнёров уточняйте по телефону{" "}
                        <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>.
                    </p>
                )}
            </section>

            <section id="regulators" className={styles.section}>
                <h2>Контролирующие органы</h2>
                <ul className={styles.regulators}>
                    {regulators.map((org) => (
                        <li key={org.id} className={styles.regulator}>
                            <h3 className={styles.regulatorName}>{org.name}</h3>
                            {org.address ? <p className={styles.regulatorLine}>{org.address}</p> : null}
                            {org.phone ? (
                                <p className={styles.regulatorLine}>
                                    <a href={`tel:${org.phone.replace(/[^\d+]/g, "")}`}>{org.phone}</a>
                                </p>
                            ) : null}
                            {org.site ? (
                                <p className={styles.regulatorLine}>
                                    <a href={org.site} target="_blank" rel="noreferrer">{org.site}</a>
                                </p>
                            ) : null}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
```

`app/(site)/documents/error.tsx`:

```tsx
"use client";

import { CLINIC } from "@/lib/constants";

/** Бэкенд недоступен, а прошлой удачной версии в кеше нет. */
export default function DisclosureError({ reset }: { error: Error; reset: () => void }) {
    return (
        <div className="page">
            <h1>Раскрытие информации</h1>
            <p role="alert">
                Сведения временно недоступны. Их можно получить по телефону{" "}
                <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>.
            </p>
            <button type="button" className="btn" onClick={reset}>
                Попробовать снова
            </button>
        </div>
    );
}
```

Проверить класс кнопки: `grep -n "\.btn" app/globals.css`; если класса нет — взять класс кнопок витрины из `app/(site)/contacts/ContactForm.tsx`.

- [ ] **Step 6: Remove hardcoded data and old files**

В `lib/disclosure.ts` удалить `Requisites`, `REQUISITES`, `DisclosureDoc`, `DISCLOSURE_DOCS`, `GUARANTEE_PROGRAM`, `DMS_PARTNERS`, `Regulator`, `REGULATORS` и импорт `CLINIC`, если он больше не нужен `omsNotice` (нужен — оставить). Шапочный комментарий заменить:

```ts
/**
 * Раскрытие информации по Постановлению Правительства РФ № 659.
 *
 * Данные раздела ведутся в админке и приходят с бэкенда (lib/cms.ts,
 * getDisclosure). Здесь — только правила показа: порядок категорий,
 * надпись про ОМС, формат дат.
 */
```

В `lib/disclosure.test.ts` удалить блоки `DISCLOSURE_DOCS`, `REGULATORS`, `REQUISITES` и их импорты; блоки `omsNotice`, `groupDocuments`, `guaranteeProgram`, `formatRuDate` остаются.

```bash
git rm premium-website/public/docs/contract.pdf premium-website/public/docs/price.pdf premium-website/public/docs/reestr.pdf premium-website/public/docs/nalog.pdf premium-website/public/docs/pp-659.pdf
```

В `next.config.ts`, в `nextConfig`:

```ts
    // PDF раздела раскрытия раньше лежали в public/docs/. Ссылки на них
    // проиндексированы — ведём на страницу раздела, а не в 404.
    async redirects() {
        return [{ source: "/docs/:path*", destination: "/documents", permanent: true }];
    },
```

- [ ] **Step 7: Full verification**

Run: `cd premium-website && npx vitest run && npx tsc --noEmit -p . && npx eslint app lib && npm run build`
Expected: всё PASS; в выводе сборки `/documents` помечен как динамический (`ƒ`); `grep -rn "REQUISITES\|DISCLOSURE_DOCS\|REGULATORS\|DMS_PARTNERS" app lib` — пусто.

- [ ] **Step 8: Manual check** (бэкенд с данными из релиза 1, `npm run build && npm start`)

1. `/documents` показывает реквизиты, документы по группам, программу госгарантий в блоке ОМС, партнёров и органы из админки.
2. В админке переименовать документ → обновить `/documents` → новое название.
3. `/docs/price.pdf` → 308 на `/documents`.
4. Остановить бэкенд, перезапустить `npm start` (кеш пуст) → `/documents` показывает текст `error.tsx` с телефоном; запустить бэкенд → «Попробовать снова» → раздел на месте.
5. Режим для слабовидящих (панель «Глаз») на `/documents` — вёрстка не развалилась.

- [ ] **Step 9: Commit**

```bash
git add premium-website/lib/cms.ts premium-website/lib/cms.test.ts "premium-website/app/(site)/documents/page.tsx" "premium-website/app/(site)/documents/error.tsx" premium-website/lib/disclosure.ts premium-website/lib/disclosure.test.ts premium-website/next.config.ts
git commit -m "feat(disclosure): витрина берёт раздел раскрытия с бэкенда, хардкод удалён"
```

---

## Отступления от спеки (уже внесены в спеку)

1. `@Valid` + `@Pattern` → ручной `DisclosureValidator` (задача 2): стартер валидации не подключён, PATCH частичный.
2. Страница `/documents` рендерится на запрос (`revalidate = 0`), кеш — у fetch с тегом (задача 12): иначе сборка образа ходила бы на бэкенд и падала бы при его недоступности, раз `getDisclosure()` бросает.
3. `revalidateTag(DISCLOSURE_TAG, { expire: 0 })` вместо `revalidateTag("disclosure")`: в Next 16 форма с одним аргументом устарела, а `"max"` показал бы следующему посетителю старую версию.
4. В ответах DTO строковые поля — `""` вместо `null`, чтобы витрина не проверяла каждое поле.
