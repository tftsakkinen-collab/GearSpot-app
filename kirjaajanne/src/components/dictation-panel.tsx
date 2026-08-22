return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative">
        {isRecording && (
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
        )}
        <Button
          size="lg"
          onClick={handleRecorderButtonClick}
          disabled={isTranscribing}
          className={cn(
            "relative h-24 w-24 rounded-full p-0 shadow-lg transition-transform hover:scale-105 sm:h-32 sm:w-32",
            isRecording
              ? "bg-destructive text-destructive-foreground shadow-destructive/30 hover:bg-destructive/90"
              : "shadow-primary/20"
          )}
          aria-label={isRecording ? "Lopeta nauhoitus" : "Aloita sanelun nauhoitus"}
          aria-pressed={isRecording}
        >
          {isTranscribing ? (
            <Loader2 className="size-10 animate-spin sm:size-12" />
          ) : isRecording ? (
            <Square className="size-10 sm:size-12" fill="currentColor" />
          ) : (
            <Mic className="size-10 sm:size-12" />
          )}
        </Button>
      </div>
      <span className="text-base font-semibold tracking-wide text-primary sm:text-lg">
        {isTranscribing
          ? "Litteroidaan puhetta..."
          : isRecording
          ? `Nauhoitetaan... ${formatRecordingTime(recordingTime)}`
          : "Sanele tästä"}
      </span>
      <span className="text-sm text-muted-foreground">
        {isRecording
          ? "Paina uudelleen lopettaaksesi nauhoituksen."
          : "Paina ja aloita sanelu \u23CE ei asennuksia, ei viivettä."}
      </span>

      {micError && (
        <div className="flex w-full max-w-2xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={handleMicClick}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Tai kirjoita sanelu käsin
        </button>
      )}

      {isOpen && (
        <Card className="mt-4 w-full max-w-2xl text-left">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Vapaa sanelu</CardTitle>
              <CardDescription>
                Sanele mikrofonilla tai kirjoita/liitä teksti alle. Tekoäly
                jäsentää sen Kanta-yhteensopivaksi kirjaukseksi.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Piilota sanelupaneeli"
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={onFormSubmit} className="flex flex-col gap-3">
              <Textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Esim. Potilas kertoo alaselän kivusta, joka on jatkunut kaksi viikkoa nostotilanteen jälkeen..."
                className="min-h-32"
                disabled={isLoading || isTranscribing}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || isTranscribing || input.trim().length === 0}
                  className="gap-1.5"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {isLoading ? "Kirjataan..." : "Muodosta Kanta-kirjaus"}
                </Button>
              </div>
            </form>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Kirjauksen muodostaminen epäonnistui: {error.message}
                </span>
              </div>
            )}

            {completion && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="size-4 text-primary" />
                  Kanta-kirjaus
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {completion}
                </pre>
              </div>
            )}

            {completion && (
              <Button
                onClick={handleCopyAndClear}
                className={`w-full mt-2 font-bold text-lg py-6 transition-all ${
                  isCopied ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {isCopied ? "Kopioitu potilastietojärjestelmään!" : "Kopioi ja Tyhjennä (Ctrl+C)"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}