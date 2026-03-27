# Link all skill folders into target directory
stow target:
    @for dir in */; do \
        dir="${dir%/}"; \
        mkdir -p "{{target}}/.claude/skills" "{{target}}/.agents/skills"; \
        echo "Linking $dir"; \
        ln -sfn "$(pwd)/$dir" "{{target}}/.claude/skills/$dir"; \
        ln -sfn "$(pwd)/$dir" "{{target}}/.agents/skills/$dir"; \
    done

# Unlink all skill folders from target directory
unstow target:
    @for dir in */; do \
        dir="${dir%/}"; \
        [ -L "{{target}}/.claude/skills/$dir" ] && rm "{{target}}/.claude/skills/$dir"; \
        [ -L "{{target}}/.agents/skills/$dir" ] && rm "{{target}}/.agents/skills/$dir"; \
    done

# Relink (unlink then link) all skill folders
restow target:
    just unstow "{{target}}"
    just stow "{{target}}"
